*Update, October 2026: the particle sculpture mentioned here has been replaced by a 3D campus that stays the same on every slide. The pause button now stops it too, and with reduced motion it’s drawn once, standing still.*

Auto-rotating carousels have a bad reputation, mostly earned. Text moves while you’re reading it, the controls are tiny, and keyboard and screen reader users get lost. We still wanted one: our hero has four slides, one for each thing we do, with a particle sculpture that changes shape for each.

These are the changes that made it usable for everyone. Most of them are small.

## 1. A visible pause button

WCAG 2.2.2, “Pause, Stop, Hide”, is clear: anything that starts moving on its own, lasts more than five seconds and sits alongside other content needs a way to pause it. Ours is a round button next to the slide tabs. Its label is “Pause the slideshow” or “Play the slideshow”, so its name always says what pressing it will do.

## 2. Hold still while someone is reading

A pause button only helps people who find it, so the slideshow also holds still on its own:

- while the mouse is over the headline or the tabs,
- while keyboard focus is anywhere inside the hero.

We hold only for keyboard focus (`:focus-visible`), not for a mouse click. Otherwise clicking a tab would freeze the slideshow until you clicked somewhere else. When the pointer or focus leaves, the timer continues from where it stopped instead of starting the slide over.

## 3. Respect reduced motion

If the visitor’s system asks for reduced motion, the slideshow starts paused, slides cross-fade instead of sweeping across the screen, and the particle sculpture is drawn once per slide with no animation. Visitors can still press play.

## 4. Slides are tabs, so use the tabs pattern

The four slide selectors are a `tablist`, and each slide is a `tabpanel` labelled by its tab. The keyboard works the way the [ARIA Authoring Practices tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) describes:

- Only the selected tab is in the Tab order (a “roving” `tabindex`), so the whole slideshow is one Tab stop, not four.
- The arrow keys move between tabs, and Home and End jump to the first and last.
- Moving to a tab shows its slide straight away.

## 5. Announce changes only when the visitor caused them

A screen reader should announce a new slide when the visitor picked it, not every eight seconds while they’re trying to read something else. The container of the slides is `aria-live="off"` while the slideshow plays, and switches to `aria-live="polite"` as soon as it’s paused or held. The [carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) in the ARIA Authoring Practices recommends the same.

## 6. One heading that doesn’t move

Every slide has its own big headline, but a page should have one stable `h1`. Ours is visually hidden and says who we are, with our name and tagline; the slide headlines are `h2`s. Slides that aren’t showing are hidden from screen readers with `aria-hidden`, and their “Get in touch” buttons are taken out of the Tab order, so nobody lands on a slide they can’t see.

## 7. Touch and high contrast

- On phones, the tabs turn into slim story bars, but each one is still at least 44 px tall, so it’s easy to tap.
- Swiping changes the slide, but only for a mostly horizontal swipe of at least 50 px, so scrolling the page never flips a slide by accident.
- In Windows’ high-contrast mode (`forced-colors`), colours are replaced by the system’s, which would erase the only thing marking the selected tab. So in that mode it gets an outline in the system’s highlight colour.

## How we checked it

Automated tools can’t tell you whether a carousel is usable, so most of this was checked by hand:

- **Keyboard only:** Tab into the hero, move through the slides with the arrow keys, and check that focus is always visible and the slideshow holds while focus is inside.
- **Reduced motion** turned on, to check the slideshow starts paused and the transitions are fades.
- **Announcements:** `aria-live` reads “off” while the slides rotate and “polite” while they’re held.

Lighthouse’s accessibility audit flagged one problem on the page, and it wasn’t in the hero. The grey names in our tech-stack strip had a contrast ratio of 2.2:1. We darkened them to 3.6:1, above the 3:1 that large bold text needs, and the score went from 97 to 100.

None of this made the hero less striking. It made it calmer to use.
