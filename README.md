# Runtime Collective — website + CMS

Built with **Next.js 15** (App Router, React 19).

- **Site**: the landing page and its sub-pages, rendered on the server and cached (layout and motion
  modelled on eurisko.net; visuals are built in code).
- **API**: Next.js route handlers in `src/app/api/`, with MongoDB (Mongoose) code in `server/`.
- **CMS**: a content studio at **`/admin`** for editing every section of the site and reading contact-form messages.

Pages are built ahead of time from the CMS content and rebuilt the moment the CMS saves (and at most
every 5 minutes). If the database is unreachable while building, the built-in defaults
(`src/data/content.js`) are used, so the site never shows a blank page.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run dev            # site, API and CMS on http://localhost:3000
```

Then open **http://localhost:3000/admin** and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
The first time it connects to the database, the app creates the site content from the defaults and that first admin
account. Change the password under **Account** afterwards.

Requires Node 18.18+. (Next.js 15 and Mongoose 8 are the newest that run on Node 18; on Node 20+ they can be upgraded.)

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server (site, API and CMS) with hot reload |
| `npm run build` | Production build into `.next/` |
| `npm start` | Production server on port 3000 (`npm start -- -p 8080` for another) |
| `npm run seed` | Create default content / first admin if missing |
| `npm run seed -- --reset` | Overwrite the site content with the defaults (keeps users and messages) |

## The CMS

Every section of the page is editable: hero slides (headline and tab text), About, Services,
Industries, Solutions, Selected work, Tech stack, Numbers, Client reviews, Insights, Contact,
brand/social links and SEO. Lists can be reordered, duplicated and removed; changes go live as
soon as you press **Save** (or ⌘/Ctrl + S). Invalid input is rejected by the API with a message
pointing at the field.

The home page shows the first four **Selected work** projects and the Work page (`/work`) lists
them all, so keep the ones to lead with at the top. A project's link is shown as "Visit example.com".

**Selected work** projects and **Client reviews** have an **Active** switch: turn it off to hide one
from the site without deleting it (the API leaves inactive items out of the public content). The
reviews section stays hidden until there's at least one active review. Only publish a review with
the client's OK.

**Insights** articles are written in the CMS in Markdown, and each gets its own page at
`/insights/<web address>` (made from the title if you leave it empty). An article without text can
link to a post published elsewhere instead.

The **Inbox** collects messages sent through the contact form on the site, each with the sender's
phone number (required) and a Call button. Spam is filtered with a honeypot field and rate limiting.

## Deploying

### Vercel

Vercel detects Next.js and needs no configuration.

1. In Vercel: **Add New → Project → Import** this GitHub repo and keep the detected settings.
2. Under **Environment Variables** add `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   (you can paste your whole `.env` into the first *Key* field and Vercel splits it up). Tick Preview as
   well as Production if preview deployments should work.
3. In MongoDB Atlas → **Network Access**, allow access from anywhere (`0.0.0.0/0`): Vercel functions
   don't have fixed IP addresses. Keep the database user's password long and random.
4. Deploy. The site is live at `https://<project>.vercel.app`, the CMS at `/admin`.

Optional: Vercel → Settings → Functions → set the function region closest to your Atlas cluster.

Pages are served from Vercel's cache, so visitors never wait on the database. Rate limits are kept per
function instance.

### Any other Node host (Render, Railway, a VPS…)

One Node process serves everything:

```bash
npm ci && npm run build
NODE_ENV=production npm start
```

Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` on the host, plus `TRUST_PROXY=1`
when running behind a proxy/load balancer (most platforms), so rate limits count per visitor. Serve it over
HTTPS — session cookies are HTTPS-only in production. In MongoDB Atlas, allow the host's IP under
**Network Access**.

## API

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | — | Liveness + database status |
| `GET /api/content`, `GET /api/insights/:slug` | — | Site content / one article, as JSON |
| `POST /api/contact` | — | Contact form → inbox |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | — / session | CMS sign-in |
| `GET /api/admin/content` | session | Content for editing |
| `PUT /api/admin/content/:section` | session | Replace one section (validated) |
| `GET /api/admin/messages`, `PATCH`/`DELETE /api/admin/messages/:id` | session | Inbox |
| `PUT /api/admin/account/password` | session | Change password (signs out other sessions) |

## Where things live

- `src/data/content.js` — default content (also seeds the database). `src/data/options.js` — choices offered by the CMS.
  `src/data/insights/<slug>.md` — the default articles' text, added when the database is seeded
  (`server/lib/defaults.js`); `src/data/insights.js` — article helpers shared by the site, CMS and API.
- `src/content/` — loads content from the API for the site.
- `src/components/` — site sections; `src/components/hero/` — slider and the 3D campus
  (`HeroScene.jsx`; `scene/campus.js` builds the model in code, `scene/orbit.js` handles drag, wheel,
  pinch and keyboard).
- `src/smoothScroll.js` — the site's wheel scrolling: it glides to where the wheel sends it, with a top speed
  (`MAX_SPEED`). Touch, keyboard and scrollbar scrolling are the browser's own, as is everything with reduced motion.
- `src/admin/` — the CMS (`schema.jsx` describes every editable field).
- `src/app/` — the Next.js routes. `(site)/` holds the public pages (its `layout.jsx` reads the CMS content
  on the server and hands it to the components); `admin/` loads the CMS; `api/` is the API; `sitemap.js`,
  `robots.js`, `not-found.jsx` (a real 404 for anything that isn't a page) and `error.jsx`. `meta.js` builds
  each page's title, description, canonical and Open Graph tags.
- `src/views/` — the pages' components (`/work`, `/insights`, `/insights/<slug>`); `src/App.jsx` is the home
  page and `src/BelowFold.jsx` everything under its hero. `src/content/Markdown.jsx` renders article text
  (React elements only, never raw HTML).
- `server/` — database code used by the routes: Mongoose models (`models/SiteContent.js` validates content),
  `lib/site.js` (what pages render from), `http.js` (the wrapper every API route uses: database, sign-in,
  errors), `session.js` and `rateLimit.js`.
- `next.config.mjs` — security headers (CSP and friends) and the old `.html` redirects. The site address for
  canonical URLs and the sitemap comes from `VERCEL_PROJECT_PRODUCTION_URL`, or `SITE_URL` to override
  (`siteUrl()` in `server/config.js`).
- `public/` — favicon and app icons, the social share image (`og.jpg`) and the hero's poster
  (`hero-poster.webp` and `hero-poster-640.webp`): a still of the 3D campus at its starting view, shown
  until WebGL draws it. Whenever the campus or its lighting changes, re-render it with the site running
  locally: `npx -p puppeteer-core node scripts/render-poster.mjs`.
- `DESIGN.md` — the design system (tokens, type, components, do's and don'ts). Read it before adding UI.

## Security notes

- Passwords are hashed with bcrypt; sessions are signed JWTs in an httpOnly, SameSite=Strict cookie.
- Sign-in and the contact form are rate limited; security headers (CSP etc.) are set in `next.config.mjs`.
  Scripts are limited to this site's own, plus the inline ones Next.js needs.
- `.env` holds secrets and is git-ignored — keep it out of version control.

## Troubleshooting

- **`[db] connection failed: authentication failed`** — the username/password in `MONGODB_URI` don't
  match a database user in Atlas (Database Access). Reset the user's password there and update `.env`.
- **Server selection timed out** — add your IP (or the host's) in Atlas → Network Access.
- While the database is down the site still renders with the default content, but the CMS can't sign in.
