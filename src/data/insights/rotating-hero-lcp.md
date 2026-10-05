*Update, October 2026: the hero’s artwork is now a 3D scene instead of the particle sculpture described here. The fix works the same way: a still of the scene stands in until WebGL draws it.*

Our home page opens with a hero that rotates through four headlines, eight seconds each. During an audit of our own site we ran Lighthouse with applied throttling, where the browser really is slowed down to a mid-range phone on a slow connection. The page was visible after 3 seconds. Lighthouse reported a Largest Contentful Paint (LCP) of **12.8 seconds**.

## What LCP actually measures

LCP is the moment the largest image or block of text in the viewport finished painting. The browser doesn’t pick it once. It reports a new candidate every time something larger than the current one paints, and only stops when the visitor interacts with the page by tapping, clicking, pressing a key or scrolling. Moving the mouse doesn’t count.

For a carousel, that’s a trap. Our headlines are set line by line, and a line of the second headline covers more pixels than any line of the first. When it slid in eight seconds later, Chrome reported it as the new largest paint, and the LCP moved to that moment. Lighthouse even named the element: a line of the second slide’s headline.

It isn’t only a lab problem. A real visitor who reads the hero for eight seconds without scrolling or clicking records the same late LCP, and that field data is what Google uses for Core Web Vitals.

## Hiding the next headline doesn’t help

Our first idea was to keep the upcoming headlines out of the running. Maybe Chrome ignores text that was hidden when the page loaded? We built a bare test page: a small headline painted at load, and a larger one revealed after 1.5 seconds. We tried four ways of hiding the larger one until then:

| How the next headline was hidden | New LCP entry when it appeared? |
| --- | --- |
| `visibility: hidden` | Yes, at 1.5 s |
| `opacity: 0` | Yes, at 1.5 s |
| `clip-path: inset(0 0 0 100%)` | Yes, at 1.5 s |
| `transform: translateX(120%)`, off screen | Yes, at 1.5 s |

Each time, Chrome reported the larger headline (152,082 px², against 19,885 px² for the first) as the new LCP the moment it became visible. In hindsight that’s the point of the metric: it measures what the visitor sees, and none of those tricks change what ends up on screen.

## The fix: paint the largest thing first

If later paints can’t be hidden from LCP, they have to lose on size. Chrome only reports an element that is larger than the current largest one, so if something bigger than any headline paints first, the rotations never register.

Our hero already has a big visual, a WebGL particle sculpture. But canvas drawings don’t count for LCP, and ours loads after the text on purpose. So we added a stand-in: a 480 × 480 WebP of the particle cloud, **33 KB**, shown where the sculpture appears and faded out when the first WebGL frame renders.

Two details made it work:

1. **It’s in the HTML, not only in React.** The image is part of the static markup in `index.html`, so it paints before any JavaScript runs. React then renders the same image in the same place, so nothing moves and nothing paints at a larger size.
2. **It’s preloaded at high priority**, so it doesn’t queue behind the scripts.

```html
<link rel="preload" href="/hero-poster.webp" as="image" type="image/webp" />

<img class="hero__poster" src="/hero-poster.webp" alt=""
     width="480" height="480" fetchpriority="high" />
```

We re-ran the test page with a 480 × 480 image painted at load. The larger headline still appeared at 1.5 seconds, and this time Chrome reported no new entry: the image, at 230,400 px², stayed the largest paint.

Two things to watch if you try this:

- **An enlarged image counts at its natural size.** Chrome uses the smaller of the displayed size and the image’s own size. Ours displays at up to 640 px wide on desktop but counts as 480 × 480, so that’s the area that has to beat your biggest headline.
- **Placeholders don’t count.** When it picks the LCP, Chrome ignores images with very little data per pixel, such as blurred previews. A 1 KB blur won’t work; ours is a real image at about 1.1 bits per pixel.

## What else we changed

The poster stopped the LCP from jumping. While we were there, we also cut the work the browser does before the hero is ready:

- **We split the page.** Everything below the hero is its own JavaScript chunk, rendered just after the hero paints. The main bundle went from 134 KB to 110 KB gzipped.
- **We build the WebGL scene when the browser is idle.** The sculpture is set up in `requestIdleCallback`, so it never competes with the first paint. With Data Saver on, it isn’t built at all and the poster stays.
- **We dropped a scroll library.** One small passive scroll listener replaced GSAP’s ScrollTrigger, which we only used for the hero’s parallax.

## The numbers

Lighthouse 12.8, mobile profile. “Lab” is a production build on our machine with applied throttling; “live” is the deployed site with Lighthouse’s default simulated throttling. These are single runs, and scores move a few points between runs.

| Metric | Before | After |
| --- | --- | --- |
| LCP, lab | 12.8 s | 1.7 s |
| Performance score, lab | 69 | 98 |
| LCP, live | 2.3 s | 1.3 s |
| Total Blocking Time, live | 790 ms | 260 ms |
| Performance score, live | 72 | 94 |

## If your hero rotates

- Check which element Lighthouse names as the LCP. If it’s a slide that appears later, your LCP is measuring your carousel’s timer.
- Hiding upcoming slides doesn’t take them out of LCP. Painting something larger first does.
- Put that first paint in the static HTML, so it doesn’t wait for your JavaScript.
