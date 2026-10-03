import * as THREE from 'three';

// Turn the campus by dragging, zoom with the wheel or a pinch, and use the
// keyboard when it has focus. Nothing here traps the page: at full zoom-out
// the wheel scrolls the page as usual, and once the page has scrolled it
// always does; on touch screens vertical drags scroll the page
// (touch-action: pan-y) and sideways drags turn the campus.

export const HOME = { az: 30, el: 31, zoom: 1, tx: 0, ty: 0.75, tz: 0 };
const EL = [10, 72];
const ZOOM = [0.38, 1];
// How far the camera's target may wander when zooming in on a spot.
const REACH = { x: 3.8, z: 3.0 };

// Wheel zoom: the most one wheel event counts for (pixels), how far the zoom
// may be sent ahead of the view (a ratio), and the pause that ends a turn (ms).
const NOTCH = 120;
const LEAD = 1.3;
const GESTURE_GAP = 180;

const clamp = THREE.MathUtils.clamp;

export function createOrbit({ element, camera, reduced, onInput }) {
  const state = { ...HOME };
  const goal = { ...HOME };
  let spin = 0; // degrees per second, after a flick
  const pointers = new Map();
  let pinch = null;
  let last = { x: 0, t: 0, v: 0 };

  const input = () => onInput?.();

  // --- Zooming -------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4);
  const hit = new THREE.Vector3();

  // The point on the campus under the cursor, if any.
  function pointAt(clientX, clientY) {
    const rect = element.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, 1 - ((clientY - rect.top) / rect.height) * 2);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(ground, hit) ? hit : null;
  }

  // Zooming in drifts towards the point under the cursor; zooming out drifts
  // back to the centre, reaching it at full zoom-out.
  function zoomTo(next, point) {
    const zoom = clamp(next, ...ZOOM);
    if (zoom < goal.zoom && point) {
      const f = 1 - zoom / goal.zoom;
      goal.tx = clamp(goal.tx + (point.x - goal.tx) * f, -REACH.x, REACH.x);
      goal.tz = clamp(goal.tz + (point.z - goal.tz) * f, -REACH.z, REACH.z);
    } else if (zoom > goal.zoom) {
      const f = (zoom - goal.zoom) / (ZOOM[1] - goal.zoom);
      goal.tx += (HOME.tx - goal.tx) * f;
      goal.tz += (HOME.tz - goal.tz) * f;
    }
    goal.zoom = zoom;
  }

  // The wheel moves the zoom at most one notch per event and never more than
  // LEAD ahead of what's on screen, so a fast wheel can't fling the camera.
  let zoomedAt = -Infinity;
  const onWheel = (e) => {
    const zoomingOut = e.deltaY > 0;
    if (!e.ctrlKey) {
      if (window.scrollY > 4) return; // the page is scrolling: let it
      if (zoomingOut && goal.zoom >= ZOOM[1] - 0.001) {
        // Fully out: scroll the page. The tail of the turn that zoomed out
        // is dropped first, so the page doesn't lurch as the zoom ends.
        if (e.timeStamp - zoomedAt > GESTURE_GAP) return;
        zoomedAt = e.timeStamp;
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
    zoomedAt = e.timeStamp;
    const pixels = clamp(e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1), -NOTCH, NOTCH);
    // Trackpad pinches arrive as ctrl + wheel with small deltas.
    const next = goal.zoom * Math.exp(pixels * (e.ctrlKey ? 0.01 : 0.0012));
    zoomTo(clamp(next, state.zoom / LEAD, state.zoom * LEAD), pointAt(e.clientX, e.clientY));
    input();
  };

  // --- Dragging and pinching -------------------------------------------------
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    element.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    spin = 0;
    last = { x: e.clientX, t: e.timeStamp, v: 0 };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: goal.zoom };
    }
    element.classList.add('is-dragging');
    input();
  };

  const onMove = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((pinch.zoom * pinch.distance) / Math.max(distance, 1), pointAt((a.x + b.x) / 2, (a.y + b.y) / 2));
    } else if (pointers.size === 1) {
      goal.az -= dx * 0.3;
      // Touch drags only turn it: up and down scroll the page.
      if (p.type !== 'touch') goal.el = clamp(goal.el + dy * 0.2, ...EL);
      const dt = Math.max(e.timeStamp - last.t, 1);
      last = { x: e.clientX, t: e.timeStamp, v: last.v * 0.6 + ((-dx * 0.3) / dt) * 1000 * 0.4 };
    }
    input();
  };

  const onUp = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      element.classList.remove('is-dragging');
      // A flick keeps it turning for a moment (not with reduced motion).
      const recent = e.timeStamp - last.t < 80;
      spin = reduced || !recent ? 0 : clamp(last.v, -400, 400);
    }
    input();
  };

  // Double-click puts it back.
  const onDoubleClick = () => {
    Object.assign(goal, HOME, { az: HOME.az + Math.round((goal.az - HOME.az) / 360) * 360 });
    spin = 0;
    input();
  };

  // --- Keyboard ----------------------------------------------------------------
  const onKey = (e) => {
    const actions = {
      ArrowLeft: () => (goal.az += 15),
      ArrowRight: () => (goal.az -= 15),
      ArrowUp: () => (goal.el = clamp(goal.el + 6, ...EL)),
      ArrowDown: () => (goal.el = clamp(goal.el - 6, ...EL)),
      '+': () => zoomTo(goal.zoom * 0.8),
      '=': () => zoomTo(goal.zoom * 0.8),
      '-': () => zoomTo(goal.zoom / 0.8),
      _: () => zoomTo(goal.zoom / 0.8),
      Home: onDoubleClick,
    };
    const action = actions[e.key];
    if (!action || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    action();
    input();
  };

  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onUp);
  element.addEventListener('dblclick', onDoubleClick);

  return {
    state,
    onKey,
    // Eases the view towards where it's been sent; true while still moving.
    step(dt) {
      if (spin) {
        goal.az += spin * dt;
        spin *= Math.exp(-dt * 3.5);
        if (Math.abs(spin) < 1) spin = 0;
      }
      // Turning follows the hand closely; zooming glides.
      const turn = reduced ? 1 : 1 - Math.exp(-dt * 9);
      const glide = reduced ? 1 : 1 - Math.exp(-dt * 6);
      let moving = spin !== 0 || pointers.size > 0;
      for (const key of Object.keys(goal)) {
        const gap = goal[key] - state[key];
        const k = key === 'az' || key === 'el' ? turn : glide;
        state[key] = Math.abs(gap) < 1e-4 ? goal[key] : state[key] + gap * k;
        if (Math.abs(gap) > 1e-3) moving = true;
      }
      return moving;
    },
    dispose() {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('dblclick', onDoubleClick);
    },
  };
}
