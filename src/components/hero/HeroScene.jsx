import { memo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOUNDS, buildGarden } from './scene/garden';
import { makePause, yieldNow } from './scene/kit';
import { createOrbit, HOME } from './scene/orbit';

const FOV = 30;
// Where the garden's centre sits, as a share of the canvas height, and how
// much of the canvas it fills at full zoom-out (the tab bar covers the bottom
// on desktop).
const HERO_FRAME = { centerY: 0.45, fill: { x: 0.84, y: 0.66 }, bounds: BOUNDS };
const LABEL =
  '3D illustration of a red torii gate standing in a pond, with a pagoda, a mountain with a waterfall, deer and cherry trees on the shore. Drag to turn it and scroll to zoom, or use the arrow keys and the plus and minus keys.';
// How long a press must stay still to count as a hold, and how far it may stray.
const HOLD_MS = 1000;
const HOLD_SLACK = 8;

const rad = THREE.MathUtils.degToRad;

// The camera distance that fits the whole garden in the canvas, seen from the
// starting angle.
function fitDistance(aspect, { fill, bounds }) {
  const tanV = Math.tan(rad(FOV / 2));
  const tanH = tanV * aspect;
  const az = rad(HOME.az);
  const el = rad(HOME.el);
  const forward = new THREE.Vector3(-Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el));
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);
  const center = new THREE.Vector3(HOME.tx, HOME.ty, HOME.tz);
  const corner = new THREE.Vector3();
  let distance = 0;
  for (let i = 0; i < 8; i += 1) {
    corner
      .set(i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z)
      .sub(center);
    const depth = corner.dot(forward);
    distance = Math.max(
      distance,
      Math.abs(corner.dot(right)) / (tanH * fill.x) - depth,
      Math.abs(corner.dot(up)) / (tanV * fill.y) - depth,
    );
  }
  return distance;
}

// A miniature Japanese garden at dusk (a torii gate in a pond): the same on
// every slide, and the visitor can turn it and zoom in. Built in code once
// the page has settled (Hero.jsx decides when); the poster stands in until
// then, and stays without WebGL.
//
// The playground page uses it too, with `split` (each part of the garden can
// then be hidden, moved and added to, through what's handed to `onGarden`),
// its own `frame` and `captureWheel` (the wheel always zooms).
// `onHold` is the hero's way in to that page: a press held still.
function HeroScene({
  apiRef,
  playingRef,
  onReady,
  split = false,
  frame: framing = HERO_FRAME,
  captureWheel = false,
  label = LABEL,
  hint = true,
  onGarden,
  onHold,
  onHoldStart,
  onFail,
}) {
  const mountRef = useRef(null);
  const holdRef = useRef(null);
  const keyRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onReady, onGarden, onHold, onHoldStart, onFail };
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false;
    // Everything setup() creates is released through here, newest first, so
    // leaving the page halfway through the build frees it all the same.
    const resources = [];
    const teardown = () => resources.splice(0).reverse().forEach((release) => release());

    async function setup() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      } catch {
        handlers.current.onFail?.(); // No WebGL: the poster stays.
        return;
      }
      let pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      // Nothing that casts a shadow ever moves, so the shadow map is drawn
      // once (needsUpdate below), not every frame.
      renderer.shadowMap.autoUpdate = false;
      resources.push(() => {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 80);
      // Lights only: an environment map looked a little better on glass and
      // metal but cost a phone over 100 ms of start-up time.
      scene.add(new THREE.HemisphereLight('#c9bcff', '#1b1230', 0.95), new THREE.AmbientLight('#ffffff', 0.85));
      const key = new THREE.DirectionalLight('#fff0e0', 2.6);
      key.position.set(-5, 9, 6);
      key.castShadow = true;
      key.shadow.mapSize.setScalar(window.innerWidth < 900 ? 1024 : 2048);
      Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      const rim = new THREE.DirectionalLight('#7c6cf0', 1.6);
      rim.position.set(6, 3, -7);
      scene.add(key, key.target, rim);
      resources.push(() => key.dispose());

      await yieldNow();
      if (disposed) return teardown();
      // Built in slices of a few milliseconds, so the page stays responsive.
      const garden = await buildGarden({ pause: makePause(6), split });
      resources.push(() => garden.dispose());
      if (disposed) return teardown();
      scene.add(garden.group);

      // --- Camera ------------------------------------------------------------
      let fit = 10;
      let bounds = framing.bounds;
      let wall = 0;
      let interacted = false;
      const orbit = createOrbit({
        element: mount,
        camera,
        reduced,
        captureWheel,
        onInput: () => {
          if (!interacted) {
            interacted = true;
            setTouched(true);
          }
          wake();
        },
      });
      keyRef.current = orbit.onKey;
      resources.push(() => {
        orbit.dispose();
        keyRef.current = null;
        if (apiRef) apiRef.current = null;
      });

      const placeCamera = () => {
        const view = orbit.state;
        // Until the visitor takes over, the view sways very slightly.
        const sway = reduced || interacted ? 0 : Math.sin(wall * 0.12) * 2.5;
        const az = rad(view.az + sway);
        const el = rad(view.el);
        const distance = fit * view.zoom;
        camera.position.set(
          view.tx + Math.sin(az) * Math.cos(el) * distance,
          view.ty + Math.sin(el) * distance,
          view.tz + Math.cos(az) * Math.cos(el) * distance,
        );
        camera.lookAt(view.tx, view.ty, view.tz);
      };

      // --- Rendering ---------------------------------------------------------
      let shown = false;
      let compiled = false;
      let sceneTime = 0;
      const render = () => {
        placeCamera();
        garden.update(sceneTime);
        renderer.render(scene, camera);
        if (!shown) {
          shown = true;
          handlers.current.onReady?.();
          setReady(true);
        }
      };

      const resize = () => {
        const width = mount.clientWidth || 1;
        const height = mount.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.setViewOffset(width, height, 0, (0.5 - framing.centerY) * height, width, height);
        camera.updateProjectionMatrix();
        fit = fitDistance(camera.aspect, { fill: framing.fill, bounds });
        garden.setPixelScale((height * renderer.getPixelRatio()) / (2 * Math.tan(rad(FOV / 2))));
        if (compiled) wake();
      };

      // --- Loop --------------------------------------------------------------
      // Runs while the garden is animating (on screen and not paused) or the
      // view is still easing after a drag or zoom; otherwise it sleeps.
      let raf = 0;
      let looping = false;
      let visible = true;
      let lastDraw = 0;
      let settling = true;
      const playing = () => !reduced && (playingRef?.current ?? true);
      const frameTimes = [];
      const frame = (now) => {
        // 60 frames a second is plenty for the garden: on a 120 Hz screen
        // (frames 8.3 ms apart) draw every other one. Slower screens, 90 and
        // 100 Hz included, draw every frame.
        if (now - lastDraw < 9) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const dt = Math.min((now - lastDraw) / 1000, 0.05);
        lastDraw = now;
        wall += dt;
        if (playing()) sceneTime += dt;
        settling = orbit.step(dt);
        render();
        // A slow device (under about 38 frames a second) draws fewer pixels
        // rather than dropping frames.
        if (playing()) {
          frameTimes.push(dt);
          if (frameTimes.length === 60) {
            const average = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            frameTimes.length = 0;
            if (average > 0.026 && pixelRatio > 1) {
              pixelRatio = Math.max(1, pixelRatio - 0.25);
              renderer.setPixelRatio(pixelRatio);
              resize();
            }
          }
        }
        if (visible && (playing() || settling)) {
          raf = requestAnimationFrame(frame);
        } else {
          looping = false;
        }
      };
      function wake() {
        settling = true;
        if (looping || !visible || !compiled) return;
        looping = true;
        lastDraw = performance.now();
        raf = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
      });
      resources.push(() => {
        cancelAnimationFrame(raf);
        io.disconnect();
      });

      mount.appendChild(renderer.domElement);
      // A lost and restored context starts with an empty shadow map.
      renderer.domElement.addEventListener('webglcontextrestored', () => {
        renderer.shadowMap.needsUpdate = true;
        wake();
      });
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      resources.push(() => ro.disconnect());
      resize();
      // Compile the shaders off the main thread where the browser can, then draw.
      await renderer.compileAsync(scene, camera).catch(() => {});
      compiled = true;
      if (disposed) return teardown();
      renderer.shadowMap.needsUpdate = true;
      render();
      io.observe(mount);

      // The pause button stops the garden too.
      if (apiRef) apiRef.current = { setPlaying: () => wake(), resetView: () => (orbit.home(), wake()) };

      // The playground edits the garden through this (see scene/editor.js).
      const redraw = () => {
        renderer.shadowMap.needsUpdate = true;
        wake();
      };
      handlers.current.onGarden?.({
        garden,
        camera,
        mount,
        redraw,
        resources,
        // The plate changed size: frame it, and light all of it.
        reframe() {
          const { x, z } = garden.plate;
          bounds = { min: { x: -x, y: framing.bounds.min.y, z: -z }, max: { x, y: framing.bounds.max.y, z } };
          const reach = Math.max(x, z) + 2;
          Object.assign(key.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach });
          key.shadow.camera.updateProjectionMatrix();
          resize();
          redraw();
        },
      });
    }

    // The code has only just arrived: let the browser paint first.
    yieldNow()
      .then(() => (disposed ? undefined : setup()))
      .catch((err) => {
        if (process.env.NODE_ENV !== 'production') console.error(err); // The poster stays.
      });
    return () => {
      disposed = true;
      teardown();
    };
  }, [apiRef, playingRef, split, framing, captureWheel]);

  // A press held still on the garden for a second opens the playground: a
  // ring fills at the pointer meanwhile. Moving (that's a drag), letting go,
  // a second finger or the wheel calls it off.
  const holds = Boolean(onHold);
  useEffect(() => {
    if (!holds || !ready) return undefined;
    const mount = mountRef.current;
    const ring = holdRef.current;
    let hold = null;
    const cancel = () => {
      if (!hold) return;
      clearTimeout(hold.timer);
      hold = null;
      ring.classList.remove('is-on');
    };
    const onDown = (e) => {
      cancel();
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const rect = mount.getBoundingClientRect();
      ring.style.left = `${e.clientX - rect.left}px`;
      ring.style.top = `${e.clientY - rect.top}px`;
      ring.classList.add('is-on');
      handlers.current.onHoldStart?.();
      hold = {
        x: e.clientX,
        y: e.clientY,
        timer: setTimeout(() => {
          cancel();
          handlers.current.onHold?.();
        }, HOLD_MS),
      };
    };
    const onMove = (e) => {
      if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > HOLD_SLACK) cancel();
    };
    // A long press mustn't open the browser's own menu instead.
    const onMenu = (e) => hold && e.preventDefault();
    const stops = ['pointerup', 'pointercancel', 'pointerleave', 'wheel'];
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('contextmenu', onMenu);
    stops.forEach((type) => mount.addEventListener(type, cancel, { passive: true }));
    window.addEventListener('scroll', cancel, { passive: true });
    return () => {
      cancel();
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('contextmenu', onMenu);
      stops.forEach((type) => mount.removeEventListener(type, cancel));
      window.removeEventListener('scroll', cancel);
    };
  }, [holds, ready]);

  const onKeyDown = (e) => {
    // E (for edit) is the keyboard's way in to the playground.
    if (holds && (e.key === 'e' || e.key === 'E') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handlers.current.onHold?.();
      return;
    }
    keyRef.current?.(e);
  };
  // Until it's drawn (or without WebGL), it's only decoration.
  const a11y = ready
    ? { role: 'img', 'aria-label': holds ? `${label} Press E to edit it in the playground.` : label, tabIndex: 0, onKeyDown }
    : { 'aria-hidden': true };
  return (
    <div className={`hero-scene${ready ? ' is-ready' : ''}${touched ? ' is-touched' : ''}`} {...a11y}>
      <div ref={mountRef} className="hero-scene__canvas" />
      {holds && (
        <span ref={holdRef} className="hero-hold" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" />
          </svg>
        </span>
      )}
      {ready && hint && (
        <p className="hero-scene__hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h4M16 12h4M12 4v4M12 16v4" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <span className="hero-scene__hint-mouse">Drag to turn · Scroll to zoom{holds && ' · Hold to edit'}</span>
          <span className="hero-scene__hint-touch">Drag to turn · Pinch to zoom{holds && ' · Hold to edit'}</span>
        </p>
      )}
    </div>
  );
}

// Slide changes re-render the hero; the scene has nothing to re-render for.
export default memo(HeroScene);
