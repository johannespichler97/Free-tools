# Market Analytics — Landing page

Static marketing page for market-analytics.io. No build step, no dependencies:
plain HTML/CSS/JS. Fonts load from Google Fonts, photos from images.unsplash.com.

## Files

| File | Purpose |
|---|---|
| `index.html` | The landing page |
| `favicon.svg` | Browser tab icon |
| `.htaccess` | HTTPS redirect, security headers, caching, compression (Apache/LiteSpeed) |
| `README.md` | This file (blocked from public access by `.htaccess`) |

## Deploy to Hostinger

1. hPanel → **Websites** → *your site* → **File Manager** → open `public_html`.
2. Upload the **contents** of this `landing/` folder into `public_html`
   (`index.html`, `favicon.svg`, `.htaccess`). Enable "show hidden files" to see `.htaccess`.
3. hPanel → **Security → SSL**: install the free SSL certificate for the domain.
4. Point the domain at Hostinger: either set the domain's nameservers to Hostinger's,
   or set an `A` record for the domain (and `www` as CNAME) to the IP shown in hPanel.
   The app subdomains (`*.market-analytics.io`) keep pointing to where the app runs;
   only the root domain / `www` should point to Hostinger.
5. Open the site and check the steps in **Go-live checklist** below.

Updates: replace `index.html` with the new version from this folder. HTML is served
with `Cache-Control: no-cache`, so visitors get changes immediately.

## Contact form (must be connected before go-live)

The form is frontend only. Set the endpoint near the end of `index.html`:

```js
const CONTACT_ENDPOINT = 'https://api.example.com/contact';
```

The form sends `POST` with `Content-Type: application/json`:

```json
{
  "name": "Jane Doe",
  "company": "Acme FX Ltd.",
  "email": "jane@acmefx.com",
  "phone": "",
  "companyType": "Broker",
  "clientBase": "1,000 – 10,000",
  "website": "",
  "message": "",
  "interests": ["Full tool suite", "Trading challenges"],
  "consent": true,
  "submittedAt": "2026-10-20T09:15:00.000Z"
}
```

- Respond with any `2xx` status on success; any other status shows an error to the visitor.
- If the endpoint is on another domain, it must answer the CORS preflight (`OPTIONS`) and
  allow the landing page origin (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers: Content-Type`).
- Spam: the form contains a hidden honeypot field; submissions that fill it are dropped
  in the browser. Add server-side validation and rate limiting as well.
- While `CONTACT_ENDPOINT` is empty, the form shows a simulated success **only** on preview
  hosts (`localhost`, `htmlpreview.github.io`, local files). On any real domain it shows an
  error instead, so enquiries are never silently lost.

## Go-live checklist

- [ ] `https://` loads, `http://` redirects to `https://`
- [ ] Favicon shows in the browser tab
- [ ] `CONTACT_ENDPOINT` set; a test submission arrives in the backend
- [ ] Link preview (paste the URL into Slack/LinkedIn/WhatsApp) shows title, text and image
- [ ] Page looks right on a phone
