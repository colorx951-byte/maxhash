# MAXHASH ECOMMERCE — Multi-Page Scratch Web App

This is a plugin-free, scratch-built static web application for MAXHASH ECOMMERCE PRIVATE LIMITED.

## Pages
- index.html — Home
- products.html — All Products / Catalogue
- category.html?slug=... — Category landing pages
- product.html?slug=... — Product detail pages
- about.html — About Us
- contact.html — Contact & Enquiry
- admin.html — Prototype local admin dashboard

## Important business scope
This is a catalogue + enquiry website, not a checkout store. There is no cart, wishlist, checkout, online payment, customer account or order tracking.

## Run
Open `index.html` directly in a browser, or serve the folder with any static HTTP server.

## Prototype storage
Products and enquiries can be stored in browser localStorage. This is only for demonstration. For production, connect a secure backend/database, authentication, image storage, email notifications and optional official WhatsApp Business API.

## Content note
Demo products/images are placeholders. Replace them with approved company/product data before launch. Do not publish unverified contact details, clients, certifications, awards or claims.

## Enhancements
- SEO: per-page canonical, Open Graph, Twitter card and JSON-LD (Organization/WebSite/Product) injected at render time; unique static `<title>`/description per HTML shell; `robots.txt` and `sitemap.xml`.
- Accessibility: skip-to-content link, `aria-expanded`/`aria-current` on nav, labelled form fields, `aria-live` result count, visible focus rings, and `prefers-reduced-motion` support.
- Resilience: `category.html`/`product.html` now show a proper "not found" state instead of silently defaulting; broken images fall back to an inline SVG placeholder; images use `loading="lazy"`.
- Contact form: inline validation (name/email/phone/message), a honeypot spam guard, and `tel`/`pattern` hints.
- Admin: enquiry status workflow (New / In Progress / Closed), "New enquiries" stat, export enquiries to JSON, clear-all, and reset-to-demo catalogue.
- Catalogue: `products.html?q=term` pre-fills and runs a search (supports the JSON-LD SearchAction).
- Misc: inline SVG favicon, `noscript` fallbacks, print styles.

> Note: `SITE_URL` in `assets/app.js` and the URLs in `robots.txt`/`sitemap.xml` use a placeholder domain — update them to the production domain before launch. Add a real `assets/og.jpg` for social share previews.
