# Market Analytics — Landing page

Marketing page for market-analytics.io. No build step, no dependencies:
plain HTML/CSS/JS plus one PHP file for the contact form. Fonts load from Google Fonts, photos from images.unsplash.com.

## Files

| File | Purpose |
|---|---|
| `index.html` | The landing page |
| `favicon.svg` | Browser tab icon |
| `contact.php` | Emails contact-form requests to info@market-analytics.io |
| `.htaccess` | HTTPS redirect, security headers, caching, compression (Apache/LiteSpeed) |
| `README.md` | This file (blocked from public access by `.htaccess`) |

## Deploy to Hostinger

1. hPanel → **Websites** → *your site* → **File Manager** → open `public_html`.
2. Upload the **contents** of this `landing/` folder into `public_html`
   (`index.html`, `contact.php`, `favicon.svg`, `.htaccess`). Enable "show hidden files" to see `.htaccess`.
3. hPanel → **Security → SSL**: install the free SSL certificate for the domain.
4. Point the domain at Hostinger: either set the domain's nameservers to Hostinger's,
   or set an `A` record for the domain (and `www` as CNAME) to the IP shown in hPanel.
   The app subdomains (`*.market-analytics.io`) keep pointing to where the app runs;
   only the root domain / `www` should point to Hostinger.
5. Open the site and check the steps in **Go-live checklist** below.

Updates: replace `index.html` with the new version from this folder. HTML is served
with `Cache-Control: no-cache`, so visitors get changes immediately.

## Contact form

`contact.php` (next to `index.html`) receives the form and emails each request to
**info@market-analytics.io** via PHP `mail()`. No external service, no database.

- Recipient and sender are set at the top of `contact.php` (`MAIL_TO`, `MAIL_FROM`).
  `MAIL_FROM` must be an address on market-analytics.io, otherwise Hostinger may refuse to send.
- The visitor's address is set as **Reply-To**, so "Reply" answers the customer directly.
- Validates required fields and the email, strips line breaks from header values
  (no header injection), drops honeypot submissions, accepts only same-site requests,
  and limits each IP to 5 requests per hour.
- Preview hosts (`localhost`, `htmlpreview.github.io`, local files) can't run PHP, so there
  the form only simulates success. On the live domain it really sends, and shows an error
  to the visitor if sending fails.
- **Deliverability:** if mail for market-analytics.io is hosted somewhere other than Hostinger,
  add Hostinger to the domain's SPF record (hPanel → Emails → shows the required value),
  otherwise messages may land in spam. Always send one test request after go-live.

## Go-live checklist

- [ ] `https://` loads, `http://` redirects to `https://`
- [ ] Favicon shows in the browser tab
- [ ] Send a test request: it arrives at info@market-analytics.io (check spam too)
- [ ] Link preview (paste the URL into Slack/LinkedIn/WhatsApp) shows title, text and image
- [ ] Page looks right on a phone
