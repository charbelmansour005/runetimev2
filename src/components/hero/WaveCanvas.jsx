import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vDepth;
  varying float vHeight;
  varying float vEdge;

  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.21 + uTime * 0.55) * 0.85
            + sin(p.z * 0.34 - uTime * 0.7) * 0.55
            + sin((p.x * 0.55 + p.z) * 0.17 + uTime * 0.35) * 0.9;
    p.y += w;
    vHeight = w;
    vEdge = 1.0 - smoothstep(0.62, 1.0, abs(p.x) / 34.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uNear;
  uniform vec3 uFar;
  uniform float uOpacity;
  varying float vDepth;
  varying float vHeight;
  varying float vEdge;

  void main() {
    float far = smoothstep(6.0, 34.0, vDepth);
    vec3 color = mix(mix(uNear, uFar, far), vec3(1.0), 0.3);
    float fade = smoothstep(3.0, 9.0, vDepth) * (1.0 - smoothstep(24.0, 40.0, vDepth));
    float crest = 0.55 + 0.45 * smoothstep(-1.2, 1.6, vHeight);
    gl_FragColor = vec4(color, uOpacity * fade * crest * vEdge);
  }
`;

// A slow, violet→coral wireframe "ocean" behind the hero — our take on the
// particle-wave layer in the reference. The hero's pause button stops it.
export default function WaveCanvas({ className = '', apiRef, playingRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return undefined; // No WebGL: the hero keeps its gradient.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    camera.position.set(0, 4.4, 13);
    camera.lookAt(0, -0.6, -6);

    const NX = 120;
    const NZ = 46;
    const SX = 68;
    const SZ = 38;
    const X = (i) => (i / NX - 0.5) * SX;
    const Z = (j) => 8 - (j / NZ) * SZ;
    const pts = [];
    for (let j = 0; j <= NZ; j += 1) {
      for (let i = 0; i < NX; i += 1) pts.push(X(i), 0, Z(j), X(i + 1), 0, Z(j));
    }
    for (let i = 0; i <= NX; i += 1) {
      for (let j = 0; j < NZ; j += 1) pts.push(X(i), 0, Z(j), X(i), 0, Z(j + 1));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uNear: { value: new THREE.Color('#4d00f2') },
        uFar: { value: new THREE.Color('#ff6c6c') },
        uOpacity: { value: 0.26 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.LineSegments(geometry, material));

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (reduced) renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let raf = 0;
    let running = false;
    let visible = false;
    let last = 0;
    const frame = (now) => {
      material.uniforms.uTime.value += Math.min((now - last) / 1000, 0.05);
      last = now;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      const run = visible && !reduced && (playingRef?.current ?? true);
      if (run === running) return;
      running = run;
      if (run) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    io.observe(mount);
    if (apiRef) apiRef.current = { setPlaying: update };
    if (reduced) renderer.render(scene, camera);

    return () => {
      cancelAnimationFrame(raf);
      if (apiRef) apiRef.current = null;
      io.disconnect();
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [apiRef, playingRef]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
