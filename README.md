# Runtime Collective — website + CMS

- **Site**: React + Vite landing page (layout and motion modelled on eurisko.net; visuals are built in code).
- **API**: Node.js + Express 5 + MongoDB (Mongoose) in `server/`.
- **CMS**: a content studio at **`/admin`** for editing every section of the site and reading contact-form messages.

The site loads its content from the API and falls back to the built-in defaults
(`src/data/content.js`) if the API or database is unreachable, so it never shows a blank page.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run dev:all        # site on http://localhost:5173, API on http://localhost:4000
```

Then open **http://localhost:5173/admin** and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
On first start the API creates the site content from the defaults and that first admin
account. Change the password under **Account** afterwards.

Requires Node 18+. (Vite 6, Mongoose 8 and concurrently 9 are pinned for Node 18; on Node 20+ they can be upgraded.)

| Script | What it does |
| --- | --- |
| `npm run dev:all` | Site (Vite) and API (Express, auto-restart) together |
| `npm run dev` / `npm run dev:server` | Just the site / just the API |
| `npm run build` | Production build of the site into `dist/` |
| `npm start` | Production server: API + the built site from `dist/` on `PORT` |
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

The repo is ready for Vercel: the site is served from Vercel's CDN, and `api/index.js` runs the
Express API as a serverless function (`vercel.json` routes every `/api/*` request to it, plus article
pages and `sitemap.xml`).

1. In Vercel: **Add New → Project → Import** this GitHub repo. Framework (Vite), build command and
   output folder come from `vercel.json` — leave them as they are.
2. Under **Environment Variables** add `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   (you can paste your whole `.env` into the first *Key* field and Vercel splits it up).
3. In MongoDB Atlas → **Network Access**, allow access from anywhere (`0.0.0.0/0`): Vercel functions
   don't have fixed IP addresses. Keep the database user's password long and random.
4. Deploy. The site is live at `https://<project>.vercel.app`, the CMS at `/admin`.

Optional: Vercel → Settings → Functions → set the function region closest to your Atlas cluster.

On Vercel, `/api/content` is cached at the edge for 10 seconds and refreshed in the background, so
visitors never wait for a cold function and CMS saves appear within a few seconds. Rate limits are
kept per function instance.

### Any other Node host (Render, Railway, a VPS…)

One Node process serves everything:

```bash
npm ci && npm run build
NODE_ENV=production npm start
```

Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `NODE_ENV=production` on the
host, plus `TRUST_PROXY=1` when running behind a proxy/load balancer (most platforms). Serve it over
HTTPS — session cookies are HTTPS-only in production. In MongoDB Atlas, allow the host's IP under
**Network Access**.

## API

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | — | Liveness + database status |
| `GET /api/content` | — | All site content |
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
- `src/components/` — site sections; `src/components/hero/` — slider, wave and the 3D campus
  (`HeroScene.jsx`; `scene/campus.js` builds the model in code, `scene/orbit.js` handles drag, wheel,
  pinch and keyboard).
- `src/admin/` — the CMS (`schema.jsx` describes every editable field).
- `server/` — Express app, Mongoose models (`models/SiteContent.js` validates content), routes and middleware.
- `api/index.js` + `vercel.json` — the Vercel serverless entry and routing/headers config. Only real pages
  (`/`, `/work`, `/insights`, `/insights/<slug>`, `/admin`) get the app; anything else is a real 404 (`public/404.html`).
- `server/routes/pages.js` — article pages and `sitemap.xml`, built from the CMS content: each article
  page is `insights.html` with the article's title, summary, canonical URL and JSON-LD in its head and
  the article embedded; unknown articles get the 404 page with a 404 status.
- `src/pages/` — pages other than the home page (`/work`, `/insights`, `/insights/<slug>`). `src/content/Markdown.jsx`
  renders article text (React elements only, never raw HTML). `src/BelowFold.jsx` — the home page below
  the hero, rendered just after the hero paints.
- `vite.config.js` — besides the build, it writes `work.html`, `insights.html` and `admin.html` (each with its own
  title, description, canonical and Open Graph tags) and `robots.txt`, using the production domain
  (`VERCEL_PROJECT_PRODUCTION_URL`, or `SITE_URL` to override; see `server/lib/html.js`).
- `public/` — favicon and app icons, the social share image (`og.jpg`) and the hero's poster
  (`hero-poster.webp` and `hero-poster-640.webp`): a still of the 3D campus at its starting view, shown
  until WebGL draws it. Whenever the campus or its lighting changes, re-render it with the site running
  locally: `npx -p puppeteer-core node scripts/render-poster.mjs`.
- `DESIGN.md` — the design system (tokens, type, components, do's and don'ts). Read it before adding UI.

## Security notes

- Passwords are hashed with bcrypt; sessions are signed JWTs in an httpOnly, SameSite=Strict cookie.
- Sign-in and the contact form are rate limited; security headers (CSP, HSTS, etc.) come from Helmet.
- `.env` holds secrets and is git-ignored — keep it out of version control.

## Troubleshooting

- **`[db] connection failed: authentication failed`** — the username/password in `MONGODB_URI` don't
  match a database user in Atlas (Database Access). Reset the user's password there and update `.env`.
- **Server selection timed out** — add your IP (or the host's) in Atlas → Network Access.
- While the database is down the site still renders with the default content, but the CMS can't sign in.
