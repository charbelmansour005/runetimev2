import * as THREE from 'three';

// The playground's hands: pick a thing up and drag it across the plate, tap it
// to select it. A press on anything that can't be moved (the ground, the
// water, the mist) is left to the camera, which turns the view as usual.
//
// `scene` is what HeroScene hands to `onGarden`. `onSelect(id)` is called when
// the selection changes and `onChange()` when the layout has.
export function createEditor(scene, { onSelect, onChange }) {
  const { garden, camera, mount, redraw } = scene;
  let drag = null;

  const pointOf = (e) => {
    const rect = mount.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2);
  };

  // Listens ahead of the camera's own handlers (capture), and keeps a press
  // on something movable to itself.
  const onDown = (e) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const point = pointOf(e);
    const id = garden.pick(point, camera);
    const unit = id && garden.unit(id);
    if (!unit?.movable) {
      drag = { tap: true, x: e.clientX, y: e.clientY, t: e.timeStamp };
      return;
    }
    e.stopImmediatePropagation();
    mount.setPointerCapture(e.pointerId);
    const floor = garden.floorAt(point, camera);
    drag = {
      id,
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      // Where on the thing it was grabbed, so it doesn't jump to the pointer.
      grab: floor ? { x: floor.x - unit.x - unit.dx, z: floor.z - unit.z - unit.dz } : { x: 0, z: 0 },
      moved: false,
    };
    garden.select(id);
    onSelect(id);
    mount.classList.add('is-moving');
    redraw();
  };

  const onMove = (e) => {
    if (!drag?.id || e.pointerId !== drag.pointer) return;
    e.stopImmediatePropagation();
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.moved = true;
    const floor = garden.floorAt(pointOf(e), camera);
    if (!floor) return;
    garden.moveTo(drag.id, floor.x - drag.grab.x, floor.z - drag.grab.z);
    redraw();
  };

  const onUp = (e) => {
    if (drag?.tap) {
      // A tap on nothing in particular lets go of the selection.
      const tap = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6 && e.timeStamp - drag.t < 300;
      drag = null;
      if (tap) {
        garden.select(null);
        onSelect(null);
        redraw();
      }
      return;
    }
    if (!drag || e.pointerId !== drag.pointer) return;
    e.stopImmediatePropagation();
    mount.classList.remove('is-moving');
    const { moved } = drag;
    drag = null;
    if (moved) onChange();
  };

  mount.addEventListener('pointerdown', onDown, true);
  mount.addEventListener('pointermove', onMove, true);
  mount.addEventListener('pointerup', onUp, true);
  mount.addEventListener('pointercancel', onUp, true);
  scene.resources.push(() => {
    mount.removeEventListener('pointerdown', onDown, true);
    mount.removeEventListener('pointermove', onMove, true);
    mount.removeEventListener('pointerup', onUp, true);
    mount.removeEventListener('pointercancel', onUp, true);
  });
}
