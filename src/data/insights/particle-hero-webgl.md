*Update, October 2026: our hero is now a 3D scene that you can turn and zoom. This post describes the particle sculpture it replaced.*

The hero on our home page is a sculpture made of particles. Each slide has its own shape: a neural network, a fan of app screens, a globe with routes, an infinity loop. When the slide changes, the particles burst apart, swirl and rebuild into the next shape. Which shape each slide uses, and its colours, are settings in our CMS, with a double helix and a cube of blocks to choose from as well.

This is how it works, and what we did to keep it from slowing the page down.

## Every shape has the same number of points

A morph is easiest when every particle has a place in every shape. So each shape is generated as exactly the same number of points: 8,400 on large screens and 4,800 on screens narrower than 900 px. Particle *n* of the neural network flies to position *n* of the globe.

The shapes are generated in code, not modelled:

- **Neural network:** four layers of nodes (5, 8, 8 and 4), each node linked to about half of the next layer. Points cluster on the nodes and run along the links.
- **Globe:** candidate points are spread evenly over a sphere with a Fibonacci lattice, and a smooth 3D noise function decides which ones are land, so they clump into continents. Arcs between “cities” lift off the surface.
- **App screens, the infinity loop, the helix and the blocks** are outlines and paths, with points spread along them in proportion to their length.

Each shape is topped up with faint “dust” until it reaches the exact count. Then the points are sorted from bottom to top. That sort is what makes a morph look built rather than random: each particle’s start delay grows slightly with its place in the list, so every new shape assembles from the bottom up.

Generation uses a seeded random number generator, so a shape comes out the same on every visit. It’s only generated the first time a slide needs it.

## The morph runs on the GPU

All the particles are one `THREE.Points` object, drawn in a single draw call with a custom shader. For each particle, the vertex shader gets:

- where it comes from and where it’s going,
- a few random values: its size, its twinkle phase and its start delay,
- a direction to drift in while it’s in flight.

A single uniform, `uMorph`, goes from 0 to 1 over 1.9 seconds. Each particle turns it into its own progress, using its start delay and an ease-in-out curve. Simplified:

```glsl
float local = clamp((uMorph - delay * 0.45) / 0.55, 0.0, 1.0);
float eased = easeInOutCubic(local);
float flight = sin(PI * local); // 0 at rest, 1 mid-flight

vec3 p = mix(from, to, eased);
p = spin(p * (1.0 + 0.2 * flight), flight * uSwirl);
p += scatter * flight * uScatter;
```

The `flight` term is the trick. It’s zero when a particle is at rest and peaks halfway, so the swirl, the billow and the drift only happen in transit, and every shape settles exactly into place. On each frame, JavaScript updates a handful of uniforms (the time, the morph progress, the pointer) and never touches the particles themselves.

## Interrupting a morph without a jump

Visitors click the slide tabs whenever they like, including halfway through a morph. If a new morph simply started from the previous shape, every particle would snap back to it first. Instead, a small JavaScript function repeats the shader’s maths and writes where each particle is *right now* into the “from” buffer before the next morph begins. It’s the only time the CPU walks through the particles: once per slide change, not once per frame.

## Keeping it cheap

The sculpture is decoration, so it must never get in the way of the page:

- **It loads last.** three.js is about 129 KB gzipped, so it’s in a separate chunk that loads after the headline has painted, and the scene is built in `requestIdleCallback`.
- **A static image stands in.** Until the first WebGL frame renders, visitors see a 33 KB image of the particle cloud. It’s also what they keep if WebGL isn’t available or Data Saver is on.
- **It stops when you can’t see it.** An `IntersectionObserver` pauses the render loop when the hero scrolls out of view.
- **It respects reduced motion.** With `prefers-reduced-motion` set, there’s no render loop at all: each shape is drawn once, with no swirl, drift or twinkle.
- **It’s capped.** The pixel ratio is capped at 2, antialiasing is off (points don’t need it), and so is depth testing; the particles use additive blending instead.
- **A crash stays contained.** The WebGL layers sit inside an error boundary, so a GPU or driver error can’t take the rest of the page down with it.

## The details that make it feel alive

- Particles part around the mouse cursor, pushed away in screen space by the vertex shader.
- Bright pulses travel through each shape: from layer to layer of the neural network, along the globe’s routes, around the infinity loop.
- Each slide’s colours blend into the next over 1.2 seconds.

The whole sculpture is two files, the shapes and the component, and adds about 8 KB gzipped on top of three.js.
