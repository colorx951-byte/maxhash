// POST /api/enquiry — emails website enquiries via Namecheap Private Email SMTP.
// Runs as a Vercel serverless function, and is also reused by serve.js for local dev.
// Config comes from environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO.
const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.privateemail.com',
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER || 'admin@maxhash.online', pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

const escHtml = s => String(s ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max); // single-line, header-safe

// Best-effort rate limit: 5 enquiries / 10 min per IP.
// On Vercel this is per warm instance only; use a shared store (e.g. Upstash/KV) for strict limits.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// Vercel pre-parses JSON into req.body; plain Node http (serve.js) needs the stream read.
function readBody(req) {
  if (req.body !== undefined) return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'Method not allowed.' }); }

  let d;
  try { d = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'Invalid request.' }); }
  if (!d || typeof d !== 'object') return send(res, 400, { ok: false, error: 'Invalid request.' });
  if (d.website) return send(res, 200, { ok: true }); // honeypot: pretend success

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip)) return send(res, 429, { ok: false, error: 'Too many enquiries. Please try again later.' });

  const e = {
    name: clean(d.name, 100), company: clean(d.company, 150), email: clean(d.email, 200),
    phone: clean(d.phone, 30), type: clean(d.type, 50), product: clean(d.product, 200),
    message: String(d.message ?? '').trim().slice(0, 5000)
  };
  if (e.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email) ||
      !/^[0-9+\-\s()]{7,20}$/.test(e.phone) || e.message.length < 5) {
    return send(res, 400, { ok: false, error: 'Please check the form fields.' });
  }
  if (!process.env.SMTP_PASS) return send(res, 500, { ok: false, error: 'Email is not configured on the server.' });

  const user = process.env.SMTP_USER || 'admin@maxhash.online';
  const rows = [['Name', e.name], ['Company', e.company], ['Email', e.email], ['Phone', e.phone],
    ['Enquiry type', e.type], ['Product', e.product]]
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:bold;background:#f4f6f9">${k}</td><td style="padding:6px 12px">${escHtml(v || '-')}</td></tr>`).join('');
  try {
    await getTransporter().sendMail({
      from: `"MAXHASH Website" <${user}>`, // must be the authenticated mailbox
      to: process.env.MAIL_TO || user,
      replyTo: `"${e.name.replace(/"/g, '')}" <${e.email}>`, // reply goes straight to the customer
      subject: `New ${e.type || 'Enquiry'}: ${e.product || 'General'} — ${e.name}`,
      text: `Name: ${e.name}\nCompany: ${e.company}\nEmail: ${e.email}\nPhone: ${e.phone}\nType: ${e.type}\nProduct: ${e.product}\n\n${e.message}`,
      html: `<h2>New website enquiry</h2><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table><h3>Requirement</h3><p style="white-space:pre-wrap;font-family:sans-serif">${escHtml(e.message)}</p>`
    });
    send(res, 200, { ok: true });
  } catch (err) {
    console.error('Mail send failed:', err.message);
    send(res, 502, { ok: false, error: 'Could not send your enquiry right now. Please try again later.' });
  }
};

module.exports.getTransporter = getTransporter;
