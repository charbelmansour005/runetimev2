*Update, October 2026: the site has since moved to Next.js, which gives every page its own HTML and answers unknown addresses with a real 404. The problem below, and the ten-second check at the end, apply to any single-page app.*

When we audited our own site, Lighthouse’s SEO check failed on one item: **robots.txt is not valid, 19 errors found**. We had never written a robots.txt, so where did 19 errors come from?

From our home page. Like a lot of single-page apps on Vercel, our config had a catch-all rewrite:

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

It sends every path that isn’t an API call to the app, so that client-side routes like `/insights` work. It also means that every URL that doesn’t exist answers **200 OK** with the home page. `/robots.txt` was our home page’s HTML, and Lighthouse was trying to read it as robots rules. So was `/sitemap.xml`, and so was any mistyped link.

## Why “everything is 200” hurts

- **Search engines see duplicates.** Every made-up URL is a copy of the home page. Google calls these “soft 404s” and has to work out on its own that they aren’t real pages.
- **Link previews are wrong.** Slack, LinkedIn and X don’t run JavaScript when they build a preview; they read the HTML `<head>`. Every URL had the home page’s head, so a link to our Insights page would have previewed as our home page.
- **Broken links hide.** A mistyped link answers 200, so it never shows up as an error in logs or monitoring.

## Rewrite only what exists

We replaced the catch-all with the routes we actually have, and let everything else fall through:

```json
"rewrites": [
  { "source": "/api/:path*", "destination": "/api" },
  { "source": "/insights", "destination": "/insights.html" },
  { "source": "/insights/:slug", "destination": "/api" },
  { "source": "/sitemap.xml", "destination": "/api" },
  { "source": "/admin", "destination": "/admin.html" },
  { "source": "/admin/:path*", "destination": "/admin.html" }
]
```

On Vercel, a path that matches no file and no rewrite gets the `404.html` from the build output, with a real 404 status. Ours is a small branded page with a link home, marked `noindex`.

We also set `trailingSlash: false`, so `/insights/` redirects to `/insights` and every page has one URL, and added redirects from `/insights.html` and `/admin.html` to their clean addresses.

## Give every page its own head

The right status code isn’t enough on its own. Each page also needs its own title, description, canonical URL and Open Graph tags in the HTML itself, for the crawlers that don’t run JavaScript.

We didn’t need a framework for that. After each build, a small Vite plugin takes the built `index.html` and writes a copy for each page:

- `insights.html`, with the Insights page’s title, description, canonical URL and Open Graph tags;
- `admin.html`, for our CMS, without the home page’s preloads and marked `noindex, nofollow`.

The same plugin writes `robots.txt`, which keeps crawlers out of the CMS and points them to the sitemap. Our API responses carry an `X-Robots-Tag: noindex` header, so JSON endpoints don’t end up in search results.

## Pages that come from the CMS

Articles like this one are written in our CMS, so they can’t be generated at build time. That’s what the `/insights/:slug` rewrite above is for: our API answers those URLs. It looks the article up, puts its title, summary and publication date into the page’s `<head>`, and embeds the article itself in the page so it renders without a second request. If there’s no article at that address, it returns the 404 page with a 404 status, the same as any other missing page.

The API serves `sitemap.xml` as well, so a new article is in the sitemap as soon as it’s published.

## The same rules locally

We also run the site outside Vercel, on a plain Express server. It follows the same rules: real pages get their own HTML, and everything else gets `404.html` with a 404 status. Otherwise our local testing would hide the very routing bugs that production would show.

## Result

Lighthouse’s SEO score went from 91 to 100 on both the home page and the Insights page. `/robots.txt` is now a real robots file, and a made-up URL on our site returns a 404.

If you run a single-page app, it’s a ten-second check: open a URL that doesn’t exist on your site and look at the status code in your browser’s network panel.
