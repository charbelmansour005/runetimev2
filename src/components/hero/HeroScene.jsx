import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOUNDS, buildGarden } from './scene/garden';
import { nextTask } from './scene/kit';
import { createOrbit, HOME } from './scene/orbit';

const FOV = 30;
// Where the garden's centre sits, as a share of the canvas height, and how
// much of the canvas it fills at full zoom-out (the tab bar covers the bottom
// on desktop).
const CENTER_Y = 0.45;
const FILL = { x: 0.84, y: 0.66 };
const LABEL =
  '3D illustration of a red torii gate standing in a pond, with a pagoda, stone lanterns and cherry trees on the shore. Drag to turn it and scroll to zoom, or use the arrow keys and the plus and minus keys.';

const rad = THREE.MathUtils.degToRad;

// The camera distance that fits the whole garden in the canvas, seen from the
// starting angle.
function fitDistance(aspect) {
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
      .set(i & 1 ? BOUNDS.max.x : BOUNDS.min.x, i & 2 ? BOUNDS.max.y : BOUNDS.min.y, i & 4 ? BOUNDS.max.z : BOUNDS.min.z)
      .sub(center);
    const depth = corner.dot(forward);
    distance = Math.max(
      distance,
      Math.abs(corner.dot(right)) / (tanH * FILL.x) - depth,
      Math.abs(corner.dot(up)) / (tanV * FILL.y) - depth,
    );
  }
  return distance;
}

// A miniature Japanese garden at dusk (a torii gate in a pond): the same on every slide, and the visitor can
// turn it and zoom in. Built in code after the headline has painted; the
// poster stands in until then (and stays without WebGL or with Data Saver on).
export default function HeroScene({ apiRef, playingRef, onReady }) {
  const mountRef = useRef(null);
  const keyRef = useRef(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (navigator.connection?.saveData) return undefined;
    const mount = mountRef.current;
    let disposed = false;
    let teardown = () => {};

    async function setup() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      } catch {
        return; // No WebGL: the poster stays.
      }
      let pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;

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

      await nextTask();
      if (disposed) return;
      const garden = await buildGarden({ pause: nextTask });
      if (disposed) {
        garden.dispose();
        return;
      }
      scene.add(garden.group);

      // --- Camera ------------------------------------------------------------
      let fit = 10;
      let wall = 0;
      let interacted = false;
      const orbit = createOrbit({
        element: mount,
        camera,
        reduced,
        onInput: () => {
          if (!interacted) {
            interacted = true;
            setTouched(true);
          }
          wake();
        },
      });
      keyRef.current = orbit.onKey;

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
          onReadyRef.current?.();
          setReady(true);
        }
      };

      const resize = () => {
        const width = mount.clientWidth || 1;
        const height = mount.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.setViewOffset(width, height, 0, (0.5 - CENTER_Y) * height, width, height);
        camera.updateProjectionMatrix();
        fit = fitDistance(camera.aspect);
        garden.setPixelScale((height * renderer.getPixelRatio()) / (2 * Math.tan(rad(FOV / 2))));
        if (compiled) wake();
      };

      // --- Loop --------------------------------------------------------------
      // Runs while the garden is animating (on screen and not paused) or the
      // view is still easing after a drag or zoom; otherwise it sleeps.
      let raf = 0;
      let looping = false;
      let visible = true;
      let last = 0;
      let settling = true;
      const playing = () => !reduced && (playingRef?.current ?? true);
      const frameTimes = [];
      const frame = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        wall += dt;
        if (playing()) sceneTime += dt;
        settling = orbit.step(dt);
        render();
        // A slow device draws fewer pixels rather than dropping frames.
        if (playing()) {
          frameTimes.push(dt);
          if (frameTimes.length === 90) {
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
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
      });

      mount.appendChild(renderer.domElement);
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      resize();
      // Compile the shaders off the main thread where the browser can, then draw.
      await renderer.compileAsync(scene, camera).catch(() => {});
      compiled = true;
      if (disposed) {
        orbit.dispose();
        garden.dispose();
        renderer.dispose();
        return;
      }
      render();
      io.observe(mount);

      // The pause button stops the garden too.
      apiRef.current = { setPlaying: () => wake() };

      teardown = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        orbit.dispose();
        apiRef.current = null;
        keyRef.current = null;
        garden.dispose();
        key.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    }

    // Build it once the browser is idle, so it doesn't hold up the headline.
    const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    const idle = whenIdle(
      () =>
        setup().catch((err) => {
          if (process.env.NODE_ENV !== 'production') console.error(err); // The poster stays.
        }),
      { timeout: 1500 },
    );
    return () => {
      disposed = true;
      cancelIdle(idle);
      teardown();
    };
  }, [apiRef, playingRef]);

  // Until it's drawn (or without WebGL), it's only decoration.
  const a11y = ready
    ? { role: 'img', 'aria-label': LABEL, tabIndex: 0, onKeyDown: (e) => keyRef.current?.(e) }
    : { 'aria-hidden': true };
  return (
    <div className={`hero-scene${ready ? ' is-ready' : ''}${touched ? ' is-touched' : ''}`} {...a11y}>
      <div ref={mountRef} className="hero-scene__canvas" />
      {ready && (
        <p className="hero-scene__hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h4M16 12h4M12 4v4M12 16v4" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <span className="hero-scene__hint-mouse">Drag to turn · Scroll to zoom</span>
          <span className="hero-scene__hint-touch">Drag to turn · Pinch to zoom</span>
        </p>
      )}
    </div>
  );
}
