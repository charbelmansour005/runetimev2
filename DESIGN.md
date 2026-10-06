# Runtime Collective — DESIGN.md

The design system for runtimecollective.vercel.app: the marketing site (`/`, `/work`, `/insights`) and the
CMS (`/admin`). It follows the [DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/)
format so people and AI agents can extend the site without drifting from it. Tokens live in
`src/styles/tokens.css`; shared components in `src/styles/global.css`.

---

## 1. Visual Theme & Atmosphere

- **Mood:** a senior engineering studio. Confident, technical and calm, never playful or mystical.
- **Signature contrast:** near-black violet heroes and dark bands (`--void`, `--grad-dark`)
  alternate with white and mist content sections.
- **Hero:** a 3D *miniature Japanese garden* at dusk, built in code with three.js: a vermilion torii
  gate standing in a pond, reflected in the water, with a pagoda, an arched bridge, stone lanterns and
  cherry, maple and pine trees on the shore. It's the same on every slide (only the headline changes),
  and visitors can turn it and zoom in.
- **Signature shape:** the angular *shard* (a six-point polygon from the logo's geometry). Use it
  for small accents (icon backs, card corners, decorative layers), never as the main artwork.
- **Density:** generous. Sections breathe (100px vertical padding on desktop) and copy stays in short
  lines (~16 characters per hero line, ≤780px intros).
- **Craft details:** glass tab bar, soft per-slide glow, product mockups built in HTML/CSS with
  real typography.

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| `--void` | `#0D0016` | Hero/page background, theme colour |
| `--dusk` | `#4F435E` | End of the hero gradient |
| `--ink-900` | `#0E0E0E` | Dark band base, strongest text on light |
| `--ink-700` | `#333333` | Headings and titles on light surfaces |
| `--ink-500` | `#6E6E6E` | Body text on light. **Lightest allowed for normal text** (4.7:1 on mist, 5.1:1 on white) |
| `--white` | `#FFFFFF` | Light surface; text on dark |
| `--mist` | `#F5F5F5` | Alternate light section |
| `--violet` | `#4D00F2` | Brand accent: primary actions, active states, links on light |
| `--violet-deep` | `#28017C` | Hover/pressed for violet |
| `--violet-light` | `#8B5CFF` | Accent on dark: progress fills, focus ring, glows |
| `--lilac` | `#B9A5F5` | Hover/current nav on dark, breadcrumbs |
| `--lilac-soft` | `#E4DCFF` | Tinted tile/background |
| `--coral` | `#FF6C6C` | Secondary accent (highlights). Use sparingly, never as text on white |
| `--glass-fill` | `rgba(12,12,12,.4)` | Glass surfaces over the hero (blur 5px) |
| `--glass-stroke` | `rgba(255,255,255,.3)` | Glass borders |

**Gradients:** `--grad-hero` (160°, void → dusk); `--grad-dark` and `--grad-dark-alt` (ink-900
with violet and lilac radial glows) for dark bands.

**Text on dark surfaces:** white at 100% (headings), 86% (body), 72% (secondary), 60% (minimum, for
hints only). Never go below 60%.

**Contrast rules (WCAG 2.2 AA):**
- Normal text ≥ 4.5:1.
- Large text (≥24px, or ≥18.66px bold) ≥ 3:1. `#808086` is the lightest grey for large text on mist.
- UI boundaries such as input borders and selected states ≥ 3:1 against their background.
- Focus ring: `--violet-light`. On violet/lilac glows, use a white ring.

**CMS:** `--cms-muted` `#6B6878` for help text (≥5:1); input borders `#8E8A9E` (3.3:1).

## 3. Typography Rules

Single family: **Montserrat** variable (self-hosted by `next/font`, `font-display: swap`, latin file preloaded).
Fallback: `system-ui, -apple-system, 'Segoe UI', sans-serif`.

| Role | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|
| Hero display | `clamp(42px, 4.8vw, 69px)` (mobile `clamp(38px, 8.6vw, 56px)`) | 700 | 1.377 (mobile 1.16) | −0.058em (mobile −0.045em) |
| Page title (h1, sub-pages) | `clamp(38px, 5vw, 64px)` | 700 | 1.15 | −0.04em |
| Section title (h2) | 36px (mobile 28px) | 700 | 1.3 | −1px |
| Card title | 20px | 700 | 1.3 | −0.5px |
| Small title / promo | 16–18px | 600–700 | 1.3–1.4 | −0.3 to −0.4px |
| Body large | 17px | 400 | 1.7 | 0 |
| Body | 16px | 400 | 1.75 | 0 |
| Small | 13–14px | 500 | 1.5 | 0 |
| Meta / caption | 12px | 500–600 | 1.5 | 0 |
| Button label | 12–15px | 500–700 | 1.5 | 1–2px, uppercase for primary and large |
| Logo sub-label | 9.5px | 700 | 1 | 5px, uppercase |

**Type scale target.** The site currently uses 31 font sizes. New UI should use only the sizes
above. Product mockups inside illustrations (6.5–11px "screen" text) are the only exception.

## 4. Component Stylings

**Buttons.** Pill-shaped (`border-radius: 999px`), with 0.2s colour transitions. Touch targets are
at least 44px tall on coarse pointers.
- `.btn--primary`: white pill with violet uppercase label. 55px tall. Used on dark heroes.
- `.btn--accent`: violet pill with white label (12px). Section-head actions and promo CTAs.
- `.btn--ghost`: white pill with violet label, for dark sections.
- `.btn--lg`: a size modifier with uppercase 14px/700 text, used for form submits.
- **Label honestly.** Say where the button goes ("Start a project", "View all" only for a real
  archive).

**Filter pills.**
- On dark (`.filter-pill`): translucent. The selected pill is **inverted** (white fill, ink text).
- On light (`.archive-pill`): white with a hairline border. Selected is violet fill, white text.
- Both are toggle buttons with `aria-pressed`, and changing them is announced via a visually hidden
  status line.

**Cards.**
- Radius: `--radius-card` (20px) for large cards, 14–16px for media.
- Service cards: shard icon plus title and text.
- Insight cards (`PostCard`): 16:10 cover, then title, then meta (date, category and, for articles
  written in the CMS, reading time). Clickable only when there's an article page or a link.
- Work tiles (home page): 4:3, full-bleed colour, device mockup or screenshot, caption on a dark scrim. A
  tile is a link only when the project has one, and the link says where it goes ("Visit example.com").
- Project cards (`/work`): the same 4:3 artwork with 16px corners and no caption over it, then tag chips
  (violet on `--lilac-soft`), the name at 20px/700 and the description at 14px/1.6 in `--ink-500`.
- Review cards: white on mist, `--radius-card`, a violet quote mark on a lilac shard, the quote at
  17px/1.7 (`**bold**` gets a lilac highlighter), then a hairline and the person: a 48px round photo or
  their initials on `--lilac-soft`, name 16px/700, role and company 14px. Three to a row; a count that
  doesn't divide by three puts the remainder in the first row (one left over is shown large across the
  top). An optional "View on LinkedIn ↗" link names the site it points to.

**Article page (`/insights/<slug>`).**
- Dark page-hero band: breadcrumb, then category pill (lilac outline), date and reading time, then the
  title (`clamp(30px, 4.6vw, 56px)`) and summary. The cover overlaps the bottom of the band (e3 shadow,
  `--radius-card`).
- Body column 720px wide: 17px/1.75 `--ink-700` text, h2 28px and h3 20px in `--ink-900`, violet
  underlined links and list markers.
- Inline code on `--lilac-soft`; code blocks on `--void` at 14px, focusable so long lines scroll by
  keyboard. Tables use hairline rows and uppercase 12px headers, and wrap instead of scrolling.
- The article ends with "Published by…" and a "Start a project" action, then "Keep reading" (three
  more cards on mist).

**Glass tab bar (hero).**
- Translucent ink with a white 30% stroke and 5px blur.
- A pause/play control comes first. Tabs follow the ARIA tabs pattern (roving tabindex, arrows,
  Home/End).
- Progress fills use `--violet-light` with a glow.

**Navigation.**
- Fixed header: transparent over dark heroes, white after scrolling 80px.
- Dropdowns ("mega menus") open on hover or via their caret `<button aria-expanded>`. They close
  with Escape, an outside click, or focus leaving.
- At ≤1024px a full-screen menu acts as a modal: focus moves in, the page behind is `inert`, and
  focus returns to the menu button on close.

**Forms (contact).**
- Fields: name, email and phone (all required, phone with a "country code" hint), company (optional)
  and the message.
- Fields: dark glass with 36%-white borders (3:1), radius 10px and 16px text.
- Focus: violet border plus a 3px violet halo (with a transparent outline for forced colours).
- Errors appear per field (`aria-invalid` plus `aria-describedby`) and as a summary with
  `role="alert"`. Success moves focus to the confirmation heading.

**Shard.** `.shard` with a `--shard-a`/`--shard-b` gradient. Variants: ink, white, lilac, pink,
lavender, ice, aqua.

**3D garden (hero).**
- Built from rounded boxes, cylinders and a few extruded shapes (`src/components/hero/scene/`);
  everything that doesn't move is merged into one mesh per material.
- Palette: vermilion (`#FF4A1F`) for the gate, pagoda and bridge, with near-black roofs; moss green
  land, deep blue water, blossom pink and maple red trees, warm lantern light, and a `--violet-light`
  seam around the base. Vermilion belongs to this scene only: don't use it in the interface.
- Reflections are the same parts mirrored under the water and faded with depth (no second render).
- Moving parts: koi, drifting paper lanterns, ripples around the gate's pillars and falling petals.
  All of it stops with the hero's pause button and with reduced motion.
- Drag to turn it (all the way round), scroll or pinch to zoom towards the cursor, double-click or Home
  to reset, arrow keys and +/− when it has focus. It never traps the page: at full zoom-out the wheel
  scrolls the page, once the page has scrolled it always does, and on touch screens vertical drags
  scroll. A "Drag to turn" hint shows until the first interaction.
- A poster (`/hero-poster.webp`, rendered from the scene by `scripts/render-poster.mjs`) is shown
  until the first WebGL frame and lines up with it; it stays without WebGL or with Data Saver on.
  three.js starts loading only once the page has loaded and settled: on desktops when the browser is
  idle, on phones at the first touch or scroll (or 4 s after load), so a short visit never pays for it.
- The headline slideshow is a plain crossfade (Web Animations API, opacity only), so it runs on the
  compositor and stays smooth while the page is busy. The first headline arrives with the page and
  stays put; later slides fade in.

- **Playground** (`/playground`): holding the garden still for a second (a ring fills at the pointer;
  `E` from the keyboard) opens a page that is all garden, with a switch for everything on the plate
  (torii, mountain, deer, mist...). Tapping a thing in the 3D view hides it, with an Undo. The
  choices live in the address (`?off=tmd`, one letter per part) and in the browser, never on the
  server. There the garden is built with each part in meshes of its own (`split`); the hero keeps
  everything merged, so it draws exactly as before.

## 5. Layout Principles

- **Container:** 1240px max, with gutters of 24px (20px at ≤768px).
- **Section rhythm:**
  - 100px vertical padding (64px at ≤768px).
  - Section head (title, optional action, intro) with 56px below (36px mobile).
  - Alternate light (white/mist) and dark bands.
- **Header:** 80px tall (68px on mobile), shrinking to 64/60px when scrolled.
  `scroll-padding-top` keeps anchor targets clear of it.
- **Grids:**
  - Insights: 4 columns, then 2 at ≤1100px, then 1 at ≤560px. The archive uses 3, 2, 1.
  - Work: 4 tiles edge to edge on the home page (the first four projects). The Work page uses 3, 2, 1.
  - Numbers: 2-column stats. An odd last stat spans the row.
  - Industries: tabs plus a panel.
- **Spacing values in use:** 4, 6, 8, 10, 12, 16, 18, 20, 24, 28, 32, 36, 44, 56, 64, 100px. Prefer these.
- **Hero:**
  - Desktop: copy on the left, art in the right 60%.
  - At ≤900px: the art sits above, the headline is pinned to the bottom, and tabs become story bars.

## 6. Depth & Elevation

There's no elevation scale yet. The site has 24 distinct one-off shadows. Use these four levels for new work:

| Level | Shadow | Use |
|---|---|---|
| e1 | `0 1px 3px rgba(0,0,0,.12)` | Scrolled header, hairline lift |
| e2 | `0 0 20px rgba(0,0,0,.15)` | Dropdowns, popovers |
| e3 | `0 28px 50px -12px rgba(8,0,30,.5), 0 2px 6px rgba(8,0,30,.18)` | Floating mockup cards |
| glow | `0 0 12px rgba(139,92,255,.9)` | Accent glow (progress, focus on dark) |

**Radius scale:** 4 (bars), 8 (`--radius-tab`, pills), 10 (inputs), 14–16 (media), 20
(`--radius-card`), 999px (pill buttons), 50% (circles). Avoid new values.

**Glass:** blur 5–6px over the hero, with fill `rgba(255,255,255,.04–.06)` on dark or
`--glass-fill`.

## 7. Do's and Don'ts

**Do**
- Keep one violet primary action per view, and keep button labels honest.
- Use real, verifiable content: stats, client names and articles. The team is 5–6 developers, with
  100% client retention and 100K+ monthly users.
- Give every carousel or auto-advancing element a pause control, and pause it on hover and keyboard focus.
- Respect `prefers-reduced-motion`: no autoplay, no parallax, and static WebGL frames.
- Lazy-load heavy visuals. three.js loads only for the hero, once the page has loaded and settled.
- Use tokens. Extend `tokens.css` rather than hard-coding colours. There are 165 literal colours
  today, mostly inside mockups.

**Don't**
- Don't reintroduce rune motifs or glowing symbols carved into stone.
- Don't put text lighter than `--ink-500` on light surfaces, or under 60% white on dark.
- Don't make hover-only menus or controls, or links whose text promises something else (e.g.
  "View case study" pointing at the contact form).
- Don't make anything that grows the page's main JS without need (GSAP was removed for this: the
  hero animates with the Web Animations API, and scroll reveals are CSS transitions).
- Don't invent app or company names for client work. Use the real name with permission, or
  describe the product ("Travel eSIM app").

## 8. Responsive Behavior

| Breakpoint | Changes |
|---|---|
| ≤1200px | Hero art widens to 64%; tab text 14px |
| ≤1100px | 4-column grids become 2; industry tabs become a horizontal scroller |
| ≤1024px | Desktop nav becomes the burger and full-screen modal menu |
| ≤900px | Hero stacks (art on top, headline at the bottom, story-bar tabs); section grids simplify |
| ≤768px | Tokens shrink: gutter 20px, section padding 64px, header 68px |
| ≤560px | Single-column grids; smaller stat values |

- **Touch targets:** ≥44×44px on `pointer: coarse`. Hero story bars are thin visually but 44px tall.
- **Forced colours:** selected pills and active hero tabs get a system-colour outline.
- **Consolidation target:** the CSS currently uses 10 breakpoints (1200/1100/1024/960/900/768/760/640/560/480).
  New work should use only those in the table above.

## 9. Agent Prompt Guide

**Quick reference**
- Background: `#0D0016` → `#4F435E` hero gradient. Dark bands are `#0E0E0E` with violet/lilac radial glows.
- Accent `#4D00F2` (hover `#28017C`); on dark `#8B5CFF` / `#B9A5F5`. Secondary `#FF6C6C`.
- Text: `#333333` headings, `#6E6E6E` body on light; white 100/86/72% on dark.
- Font: Montserrat 700 for titles with tight negative tracking, 400 body at 16px/1.75.
- Shapes: 20px cards, pill buttons, the angular shard as an accent.

**Example prompts**
- "Add a section in the Runtime Collective style: mist background, h2 section title 36px/700
  #333 with −1px tracking, a ≤780px intro in #6E6E6E 16px/1.75, and three 20px-radius white cards
  with e2 shadow and a lilac shard icon. Use tokens from `src/styles/tokens.css`."
- "Build a dark band like the Industries section: `--grad-dark`, white title, 86% white body, a
  white `.btn--ghost` action, and an accessible tab list (roving tabindex, arrow keys)."
- "Create a sub-page like `/work` or `/insights`: dark `.page-hero` band with breadcrumb, then content on white,
  reusing Header and Footer: a client component in `src/views/` and a `page.jsx` under `src/app/(site)/`
  that sets its title and description with `pageMeta` (`src/app/meta.js`)."
