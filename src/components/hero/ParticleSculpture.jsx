import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { buildShape, resolveShape, scatteredCloud, seeded, SHAPE_SPIN } from './shapes';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uScatter;
  uniform float uSwirl;
  uniform float uSpinFrom;
  uniform float uSpinTo;
  uniform float uSize;
  uniform float uCenterDepth;
  uniform float uMotion;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform float uPointerForce;
  uniform vec3 uColorTop;
  uniform vec3 uColorBottom;

  attribute vec3 aFrom;
  attribute vec2 aDataFrom;
  attribute vec2 aDataTo;
  attribute vec4 aSeed;
  attribute vec3 aScatter;

  varying vec3 vColor;
  varying float vAlpha;

  const float PI = 3.141592653589793;

  vec3 spin(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, c * p.z - s * p.x);
  }

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    // Every particle leaves on its own schedule, so shapes rebuild in a wave.
    float local = clamp((uMorph - aSeed.z * 0.45) / 0.55, 0.0, 1.0);
    float eased = easeInOutCubic(local);
    float flight = sin(PI * local);

    vec3 p = mix(spin(aFrom, uTime * uSpinFrom), spin(position, uTime * uSpinTo), eased);
    // In flight, particles swirl around the centre and billow outwards.
    p = spin(p * (1.0 + 0.2 * flight), flight * uSwirl * (0.6 + 0.8 * aSeed.y));
    p += aScatter * flight * uScatter;

    float phase = aSeed.y * 6.2831853;
    p += uMotion * 0.006 * vec3(
      sin(uTime * 0.7 + phase),
      sin(uTime * 0.9 + phase * 1.7),
      cos(uTime * 0.8 + phase * 1.3)
    );

    vec2 data = mix(aDataFrom, aDataTo, eased); // flow, brightness

    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 view = viewMatrix * world;
    vec4 clip = projectionMatrix * view;

    // Particles part around the cursor.
    vec2 delta = clip.xy / clip.w - uPointer;
    delta.x *= uAspect;
    float dist = length(delta);
    float push = uPointerForce * (1.0 - smoothstep(0.0, 0.3, dist));
    vec2 shift = delta / max(dist, 0.0001) * push * 0.07;
    shift.x /= uAspect;
    clip.xy += shift * clip.w;
    gl_Position = clip;

    float pulse = uMotion * pow(0.5 + 0.5 * sin(data.x * 12.566 - uTime * 2.4), 12.0);
    float twinkle = 1.0 - uMotion * 0.3 * (0.5 + 0.5 * sin(uTime * (0.9 + aSeed.x * 2.4) + phase));
    float back = smoothstep(-1.5, 1.5, -view.z - uCenterDepth);

    vec3 color = mix(uColorBottom, uColorTop, smoothstep(-1.5, 1.5, world.y - modelMatrix[3].y));
    color = mix(color, vec3(1.0), clamp(pulse * 0.35 + aSeed.w * 0.45 + push * 0.4, 0.0, 0.8));

    vColor = color;
    vAlpha = data.y * twinkle * mix(1.0, 0.28, back) * (1.0 - 0.3 * flight) * (1.0 + 0.6 * pulse);
    gl_PointSize = uSize
      * (0.6 + aSeed.x * 0.7 + aSeed.w * 0.8)
      * (0.75 + 0.25 * data.y)
      * (1.0 + 0.5 * flight + 0.2 * pulse)
      / -view.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = 1.0 - smoothstep(0.1, 0.34, r);
    float halo = exp(-r * r * 6.0) * 0.22;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha * uOpacity);
  }
`;

const FOV = 30;
// World units the formations take up, and the share of the canvas they fill.
const SPAN_H = 3.3;
const SPAN_W = 3.9;
const FILL_H = 0.58;
const FILL_W = 0.8;
const BASE_Y = 0.08;
const MORPH_SECONDS = 1.9;
const INTRO_SECONDS = 2.6;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// CMS colours go to the shader as written, so particles match their swatches.
const toColor = (hex, fallback) => new THREE.Color().setStyle(hex || fallback, THREE.LinearSRGBColorSpace);

// Thousands of particles that assemble into each slide's shape and burst
// apart into the next one — the "collective" in Runtime Collective.
export default function ParticleSculpture({ apiRef, activeRef, slides, onReady }) {
  const mountRef = useRef(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    // Data Saver on: skip the WebGL sculpture and keep the static poster.
    if (navigator.connection?.saveData) return undefined;
    const mount = mountRef.current;

    const setup = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      } catch {
        return undefined; // No WebGL: the glow behind the sculpture still shows.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
      const count = window.innerWidth < 900 ? 4800 : 8400;

      const shapes = new Map();
      const shapeAt = (index) => {
        const slide = slidesRef.current[index] ?? slidesRef.current[0];
        const key = resolveShape(slide?.shape, index);
        if (!shapes.has(key)) shapes.set(key, buildShape(key, count));
        return { key, slide, ...shapes.get(key) };
      };

      // Per-particle constants: size, twinkle phase, start delay, sparkle, and
      // the direction it drifts while flying between shapes.
      const rand = seeded(7);
      const seeds = new Float32Array(count * 4);
      const scatter = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        // Shapes are sorted bottom to top, so the delay builds them upwards.
        seeds.set([rand(), rand(), 0.65 * rand() + 0.35 * (i / count), rand() < 0.025 ? 1 : 0], i * 4);
        const z = rand() * 2 - 1;
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(1 - z * z);
        const reach = 0.2 + 0.9 * rand() ** 2;
        scatter.set([Math.cos(a) * r * reach, z * reach, Math.sin(a) * r * reach], i * 3);
      }

      const to = new Float32Array(count * 3);
      const from = new Float32Array(count * 3);
      const dataTo = new Float32Array(count * 2);
      const dataFrom = new Float32Array(count * 2);
      const dynamic = (array, size) => new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', dynamic(to, 3));
      geometry.setAttribute('aFrom', dynamic(from, 3));
      geometry.setAttribute('aDataTo', dynamic(dataTo, 2));
      geometry.setAttribute('aDataFrom', dynamic(dataFrom, 2));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
      geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
      const moving = ['position', 'aFrom', 'aDataTo', 'aDataFrom'].map((name) => geometry.getAttribute(name));

      const uniforms = {
        uTime: { value: 0 },
        uMorph: { value: 1 },
        uScatter: { value: 0.55 },
        uSwirl: { value: 1.3 },
        uSpinFrom: { value: 0 },
        uSpinTo: { value: 0 },
        uSize: { value: 60 },
        uCenterDepth: { value: 10 },
        uMotion: { value: reduced ? 0 : 1 },
        uAspect: { value: 1 },
        uPointer: { value: new THREE.Vector2(9, 9) },
        uPointerForce: { value: 0 },
        uOpacity: { value: 1 },
        uColorTop: { value: new THREE.Color() },
        uColorBottom: { value: new THREE.Color() },
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      const group = new THREE.Group();
      group.position.y = BASE_Y;
      group.add(points);
      scene.add(group);

      // The first frame on screen lets the hero fade out its static poster.
      let shown = false;
      const render = () => {
        renderer.render(scene, camera);
        if (!shown) {
          shown = true;
          onReadyRef.current?.();
        }
      };

      // Copies where every particle is right now into `from`, so a new morph
      // can start mid-flight without a jump. Mirrors the vertex shader.
      const freeze = () => {
        const m = uniforms.uMorph.value;
        if (m >= 1) {
          from.set(to);
          dataFrom.set(dataTo);
          uniforms.uSpinFrom.value = uniforms.uSpinTo.value;
          return;
        }
        const t = uniforms.uTime.value;
        const cf = Math.cos(t * uniforms.uSpinFrom.value);
        const sf = Math.sin(t * uniforms.uSpinFrom.value);
        const ct = Math.cos(t * uniforms.uSpinTo.value);
        const st = Math.sin(t * uniforms.uSpinTo.value);
        for (let i = 0; i < count; i += 1) {
          const local = Math.min(1, Math.max(0, (m - seeds[i * 4 + 2] * 0.45) / 0.55));
          const e = easeInOutCubic(local);
          const flight = Math.sin(Math.PI * local);
          const j = i * 3;
          const ax = cf * from[j] + sf * from[j + 2];
          const az = cf * from[j + 2] - sf * from[j];
          const bx = ct * to[j] + st * to[j + 2];
          const bz = ct * to[j + 2] - st * to[j];
          const grow = 1 + 0.2 * flight;
          const x = (ax + (bx - ax) * e) * grow;
          const z = (az + (bz - az) * e) * grow;
          const swirl = flight * uniforms.uSwirl.value * (0.6 + 0.8 * seeds[i * 4 + 1]);
          const drift = flight * uniforms.uScatter.value;
          from[j + 1] = (from[j + 1] + (to[j + 1] - from[j + 1]) * e) * grow + scatter[j + 1] * drift;
          from[j] = Math.cos(swirl) * x + Math.sin(swirl) * z + scatter[j] * drift;
          from[j + 2] = Math.cos(swirl) * z - Math.sin(swirl) * x + scatter[j + 2] * drift;
          dataFrom[i * 2] += (dataTo[i * 2] - dataFrom[i * 2]) * e;
          dataFrom[i * 2 + 1] += (dataTo[i * 2 + 1] - dataFrom[i * 2 + 1]) * e;
        }
        uniforms.uSpinFrom.value = 0;
      };

      let current = -1;
      let tween = null;

      const morphTo = (index, { intro = false } = {}) => {
        if (index === current) return;
        current = index;
        const shape = shapeAt(index);

        if (intro) {
          from.set(scatteredCloud(count, rand));
          for (let i = 0; i < count; i += 1) dataFrom.set([rand(), 0], i * 2);
          uniforms.uSpinFrom.value = 0;
        } else {
          freeze();
        }
        to.set(shape.positions);
        dataTo.set(shape.data);
        moving.forEach((attribute) => {
          attribute.needsUpdate = true;
        });
        uniforms.uSpinTo.value = SHAPE_SPIN[shape.key] ?? 0;

        const top = toColor(shape.slide?.from, '#C7B8FA');
        const bottom = toColor(shape.slide?.to, '#7C6CF0');
        tween?.kill();

        if (reduced) {
          uniforms.uMorph.value = 1;
          uniforms.uColorTop.value.copy(top);
          uniforms.uColorBottom.value.copy(bottom);
          render();
          return;
        }

        const startTop = intro ? top : uniforms.uColorTop.value.clone();
        const startBottom = intro ? bottom : uniforms.uColorBottom.value.clone();
        const blend = { value: 0 };
        uniforms.uMorph.value = 0;
        tween = gsap
          .timeline()
          .to(uniforms.uMorph, { value: 1, duration: intro ? INTRO_SECONDS : MORPH_SECONDS, ease: 'none' }, 0)
          .to(
            blend,
            {
              value: 1,
              duration: 1.2,
              ease: 'power2.inOut',
              onUpdate: () => {
                uniforms.uColorTop.value.lerpColors(startTop, top, blend.value);
                uniforms.uColorBottom.value.lerpColors(startBottom, bottom, blend.value);
              },
            },
            0,
          );
      };

      // --- Sizing --------------------------------------------------------------
      const resize = () => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
        const distance = Math.max(SPAN_H / FILL_H / (2 * tan), SPAN_W / FILL_W / (2 * tan * camera.aspect));
        camera.position.set(0, 0, distance);
        camera.updateProjectionMatrix();
        // Point sprites scale with the sculpture, within readable limits.
        const pxPerUnit = h / (2 * tan * distance);
        uniforms.uSize.value = THREE.MathUtils.clamp(pxPerUnit * 0.055, 5.5, 10) * renderer.getPixelRatio() * distance;
        uniforms.uCenterDepth.value = distance;
        uniforms.uAspect.value = camera.aspect;
        if (reduced) render();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      resize();

      // --- Loop ----------------------------------------------------------------
      const pointer = { x: 9, y: 9, tx: 9, ty: 9, force: 0, targetForce: 0, tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0 };
      let raf = 0;
      let running = false;
      let last = 0;
      let elapsed = 0;

      const frame = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;
        const ease = 1 - Math.exp(-dt * 5);
        pointer.tiltX += (pointer.targetTiltX - pointer.tiltX) * ease;
        pointer.tiltY += (pointer.targetTiltY - pointer.tiltY) * ease;
        pointer.force += (pointer.targetForce - pointer.force) * ease;
        pointer.x += (pointer.tx - pointer.x) * Math.min(1, ease * 2.5);
        pointer.y += (pointer.ty - pointer.y) * Math.min(1, ease * 2.5);

        uniforms.uTime.value = elapsed;
        uniforms.uPointer.value.set(pointer.x, pointer.y);
        uniforms.uPointerForce.value = pointer.force;
        group.rotation.y = Math.sin(elapsed * 0.21) * 0.3 + pointer.tiltX * 0.45;
        group.rotation.x = Math.sin(elapsed * 0.16) * 0.06 + pointer.tiltY * 0.22;
        group.position.y = BASE_Y + Math.sin(elapsed * 0.7) * 0.05;

        render();
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (running || reduced) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };
      const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
      io.observe(mount);

      morphTo(activeRef?.current ?? 0, { intro: true });

      apiRef.current = {
        setSlide: (index) => morphTo(index),
        // Pointer position in page coordinates, or null when it leaves.
        setPointer: (clientX, clientY) => {
          if (clientX == null) {
            pointer.targetForce = 0;
            pointer.targetTiltX = 0;
            pointer.targetTiltY = 0;
            return;
          }
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.tx = ((clientX - rect.left) / (rect.width || 1)) * 2 - 1;
          pointer.ty = 1 - ((clientY - rect.top) / (rect.height || 1)) * 2;
          pointer.targetForce = 1;
          pointer.targetTiltX = clientX / window.innerWidth - 0.5;
          pointer.targetTiltY = clientY / window.innerHeight - 0.5;
        },
      };

      return () => {
        stop();
        tween?.kill();
        io.disconnect();
        ro.disconnect();
        apiRef.current = null;
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    // Build it once the browser is idle, so it doesn't hold up the headline.
    let teardown = () => {};
    const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    const idle = whenIdle(() => {
      teardown = setup() ?? teardown;
    }, { timeout: 1500 });
    return () => {
      cancelIdle(idle);
      teardown();
    };
  }, [apiRef, activeRef]);

  return <div ref={mountRef} className="particle-sculpture" />;
}
