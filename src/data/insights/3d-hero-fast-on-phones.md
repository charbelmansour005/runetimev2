The first thing on our home page is a 3D garden: a torii gate standing in a pond, a mountain with a waterfall, deer on the shore, fireflies. It is drawn live with three.js, and visitors can turn it, zoom it and even rearrange it. On a phone, Lighthouse scores the same page between 98 and 100 for performance.

Those two facts don’t usually go together. Here is what it took, and what we tried that made no difference.

## Where we started

On 5 October we moved the site to Next.js and replaced the hero’s artwork with the garden. Our first measurements of the live page on Lighthouse’s phone profile were not good:

| | Phone, 5 October |
| --- | --- |
| Performance score | 87–92 |
| Total Blocking Time | 125–176 ms |
| Speed Index | 6–12 s |
| Largest Contentful Paint | 1.6–2.0 s |

There was also something no score shows. The headline slid into place when the page loaded, and it stuttered: in a trace with the processor slowed four times, its last third ran at 30, then 20, then 15 frames a second.

Both problems had one cause. The 3D code arrived, was read by the browser and built the scene at the exact moment the headline was animating, and all three were competing for the same thread.

## 1. A still image goes first

The garden is not what the visitor waits for. A still of it is in the page’s HTML: a transparent WebP of about 42 KB, rendered by the scene itself from its starting angle, so the live scene can fade in over it without a jump. The page is complete, and can be read and scrolled, before any 3D code has been asked for.

## 2. The 3D starts when nobody is waiting on it

When to start is a decision, and we made it per device:

- **Desktops:** once the page has finished loading and the browser reports it is idle.
- **Phones:** at the visitor’s first touch, or four seconds after load, whichever comes first. Someone who reads the headline and leaves never downloads three.js at all.
- **Data Saver on:** never. The still stays.

## 3. The scene is built in six-millisecond slices

The garden has no model file. It is built in code: every roof tile, tree and rock is a shape placed by a few lines of JavaScript. Built in one go, that froze the page for longer than a frame.

So the builder now stops often to check the clock. Once it has used six milliseconds, it hands the thread back to the browser (with `scheduler.yield()` where there is one, a `MessageChannel` where there isn’t) and carries on in the next task. The scene is the same; the page stays responsive while it appears.

## 4. Draw less, less often

- **One mesh per material.** The hundreds of shapes that never move are merged into a handful of meshes, so all of them together cost a handful of draw calls.
- **Shadows are drawn once.** Nothing that casts a shadow moves, so the shadow map is rendered a single time, not every frame.
- **Sixty frames a second is the ceiling.** On a 120 Hz screen we draw every other frame.
- **Slow devices get fewer pixels, not fewer frames.** If the average frame takes longer than 26 ms, the scene lowers its resolution a step.
- **Off screen, it stops.** Scroll past the hero and the loop sleeps.

## 5. Animations that can’t be interrupted

The headline’s animation ran in JavaScript, on the same thread as everything above, so any busy moment showed up as a dropped frame. We moved it to the Web Animations API and animate nothing but opacity. The browser runs that on its compositor, apart from our code, so a busy page can no longer make it stutter. We also stopped replaying the first headline at load: it arrives with the HTML and stays where it is.

In the same trace as before, with the processor slowed four times, headline changes now have no gap between frames longer than 33 ms.

That let us drop the animation library, which the hero was the last thing to use: 28 KB less JavaScript, compressed, on every page.

## 6. Less JavaScript before the first paint

- The JavaScript needed before the page paints went from 163 KB to 125 KB, compressed.
- Our default content was bundled twice. Now it isn’t.
- Everything below the hero hydrates after it, in separate tasks.
- Links were fetching two other pages on every visit, because the closed mobile menu counted as “in view”. Pages are now fetched when a visitor hovers or touches a link.

## What made no difference

- **Inlining the CSS.** Nine small stylesheets looked like an easy win. Over HTTP/2, from cache, inlining them changed nothing we could measure, and added 28 KB to every HTML response. We left them alone.
- **Moving the server closer.** A slow first byte from our office turned out to be the network path, not the hosting region.

## The numbers

On 6 October, with this done, Lighthouse’s phone profile gave the live page 100 in two runs, with a Largest Contentful Paint of 1.4 s, 24–54 ms of blocking time and a Speed Index of 1.6 s. Desktop scored 100.

Since then the garden has grown a mountain, a waterfall, bamboo, deer, fireflies and mist, and a page where visitors can rearrange it. We measured again on 7 October, three runs on the phone profile:

| | Before (5 Oct) | Now (7 Oct) |
| --- | --- | --- |
| Performance score | 87–92 | 98–100 |
| Largest Contentful Paint | 1.6–2.0 s | 1.5–2.2 s |
| Total Blocking Time | 125–176 ms | 30–120 ms |
| Speed Index | 6–12 s | 1.7–2.2 s |
| Layout shift | 0 | 0 |

Accessibility, best practices and SEO are 100 in every run.

One caveat, because scores flatter. These are lab runs from our own machine, and on the phone profile the 3D scene starts late by design, so part of what Lighthouse rewards is that we don’t make it wait. That is the point: the visitor doesn’t wait either.

## If you want something heavy on your home page

- Decide what the visitor is waiting for, and make sure it isn’t the heavy thing. Ship a still in the HTML.
- Start the heavy thing when nobody is waiting on it. On a phone, that can be the first touch.
- Build in slices. Any long task can be cut into short ones if it stops to check the clock.
- Animate only opacity and transform, and let the browser run it.
- Measure after every change, on the live site. Two of our “obvious” fixes did nothing.
