'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import Logo from '../components/Logo';
import PageLink from '../components/PageLink';
import {
  ADDABLE,
  decodeHidden,
  decodeLayout,
  emptyLayout,
  encodeHidden,
  encodeLayout,
  PART_GROUPS,
  PARTS,
  TYPE_LABELS,
} from '../components/hero/scene/parts';
import './PlaygroundPage.css';

const HeroScene = lazy(() => import('../components/hero/HeroScene'));

const STORE = 'rc-garden';
// The whole view is the garden here, mountain included.
const FRAME = {
  centerY: 0.56,
  fill: { x: 0.8, y: 0.74 },
  bounds: { min: { x: -5, y: -1, z: -4 }, max: { x: 5, y: 5.8, z: 4 } },
};
const LABEL =
  '3D garden: a red torii gate in a pond, with a pagoda, a mountain with a waterfall, deer and trees. Drag the ground to turn it, scroll to zoom, or use the arrow keys and the plus and minus keys. Drag a thing to move it. Use the controls to show, hide and add things.';

// The garden from the home page, to make your own: every part has a switch,
// single things can be dragged about, taken away or added, the plate can grow
// and ponds can be dug. It's all kept in the browser and in the page's
// address, so a copied link opens the same garden.
export default function PlaygroundPage() {
  const [hidden, setHidden] = useState(() => new Set());
  const [layout, setLayout] = useState(emptyLayout);
  const [loaded, setLoaded] = useState(false); // the saved garden has been read
  const [scene, setScene] = useState('loading'); // 'loading' | 'ready' | 'failed'
  const [selected, setSelected] = useState(null); // { id, label }
  const [undo, setUndo] = useState(null); // the last thing taken away
  const [copied, setCopied] = useState('');
  const world = useRef(null); // what the scene hands over (garden, camera...)
  const sceneApi = useRef(null);
  const saved = useRef({ hidden, layout });
  saved.current = { hidden, layout };
  const spawned = useRef(0);

  // A link's garden comes first, then what this browser remembers.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let stored = {};
    try {
      stored = JSON.parse(window.localStorage.getItem(STORE) ?? '{}') ?? {};
    } catch {
      // No storage (private window), or nothing readable: start afresh.
    }
    const linked = params.has('off') || params.has('g');
    setHidden(decodeHidden(linked ? params.get('off') : stored.off));
    setLayout(decodeLayout(linked ? params.get('g') : stored.g));
    setLoaded(true);
  }, []);

  // Keep the address and the browser's memory in step.
  useEffect(() => {
    if (!loaded) return;
    const off = encodeHidden(hidden);
    const g = encodeLayout(layout);
    const query = [off && `off=${off}`, g && `g=${g}`].filter(Boolean).join('&');
    window.history.replaceState(window.history.state, '', query ? `/playground?${query}` : '/playground');
    try {
      if (query) window.localStorage.setItem(STORE, JSON.stringify({ off, g }));
      else window.localStorage.removeItem(STORE);
    } catch {
      // Not remembered, then.
    }
  }, [hidden, layout, loaded]);

  const applyParts = useCallback((set) => {
    const garden = world.current?.garden;
    if (!garden) return;
    for (const part of PARTS) garden.setVisible(part.id, !set.has(part.id));
    world.current.redraw();
  }, []);
  useEffect(() => {
    if (loaded) applyParts(hidden);
  }, [hidden, loaded, applyParts]);

  const changed = useCallback(() => setLayout(world.current.garden.layout()), []);

  // The scene is built: lay it out as saved, then let it be edited.
  const start = useCallback(
    async (handed) => {
      const { garden } = handed;
      const want = saved.current.layout;
      garden.setPlate(want.plate);
      for (const [id, [dx, dz]] of Object.entries(want.move)) {
        const unit = garden.unit(id);
        if (unit) garden.moveTo(id, unit.x + dx, unit.z + dz);
      }
      for (const id of want.gone) garden.remove(id);
      for (const [type, x, z] of want.add) await garden.add(type, x, z);
      world.current = handed;
      handed.reframe();
      applyParts(saved.current.hidden);
      const { createEditor } = await import('../components/hero/scene/editor');
      createEditor(handed, {
        onSelect: (id) => {
          const unit = id && garden.unit(id);
          setSelected(unit ? { id, label: TYPE_LABELS[unit.type] ?? 'This' } : null);
        },
        onChange: changed,
      });
      setScene('ready');
    },
    [applyParts, changed],
  );
  const onGarden = useCallback((handed) => void start(handed), [start]);
  const onFail = useCallback(() => setScene('failed'), []);

  const toggle = (id, on) =>
    setHidden((before) => {
      const next = new Set(before);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });

  const select = (id) => {
    const { garden, redraw } = world.current;
    const unit = id && garden.unit(id);
    garden.select(id);
    setSelected(unit ? { id, label: TYPE_LABELS[unit.type] ?? 'This' } : null);
    redraw();
  };

  // New things arrive along the front edge, each a little further along.
  const add = async (type) => {
    const { garden } = world.current;
    const n = spawned.current;
    spawned.current += 1;
    const pond = type === 'pond' || type === 'bigpond';
    // (Ponds in the front right corner, where there's most open ground.)
    const x = pond ? garden.plate.x - 2.6 - (n % 3) * 0.6 : ((n % 6) - 2.5) * 0.75;
    const z = pond ? garden.plate.z - 2.5 : garden.plate.z - 0.8 - (Math.floor(n / 6) % 3) * 0.55;
    const id = await garden.add(type, x, z);
    if (!id) return;
    // A part that's switched off would hide the newcomer: switch it back on.
    const { part } = garden.unit(id);
    if (saved.current.hidden.has(part)) toggle(part, true);
    select(id);
    changed();
  };

  const remove = () => {
    const { garden, redraw } = world.current;
    const unit = garden.unit(selected.id);
    setUndo({
      label: selected.label,
      back: unit.added ? [unit.kind ?? unit.type, unit.x + unit.dx, unit.z + unit.dz] : selected.id,
      key: Date.now(),
    });
    garden.remove(selected.id);
    setSelected(null);
    redraw();
    changed();
  };
  const putBack = async () => {
    const { garden, redraw } = world.current;
    const { back } = undo;
    setUndo(null);
    if (Array.isArray(back)) await garden.add(...back);
    else garden.restore(back);
    redraw();
    changed();
  };
  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  const resize = (value) => {
    const { garden, reframe } = world.current;
    garden.setPlate(value);
    reframe();
    changed();
  };

  const startOver = () => {
    const { garden, reframe } = world.current;
    garden.reset();
    reframe();
    setSelected(null);
    setUndo(null);
    setHidden(new Set());
    setLayout(emptyLayout());
    sceneApi.current?.resetView();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('Link copied');
    } catch {
      setCopied('Copy the address from your browser’s bar');
    }
    setTimeout(() => setCopied(''), 4000);
  };

  const ready = scene === 'ready';
  return (
    <main className="playground">
      <div className="playground__backdrop" aria-hidden="true" />
      <header className="playground__bar">
        <PageLink href="/" className="playground__home" aria-label="Runtime Collective, home">
          <Logo />
        </PageLink>
        <PageLink href="/" className="playground__back">
          Back to site
        </PageLink>
      </header>

      <div className="playground__stage">
        {scene !== 'failed' && loaded && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HeroScene apiRef={sceneApi} split frame={FRAME} captureWheel hint={false} label={LABEL} onGarden={onGarden} onFail={onFail} />
            </Suspense>
          </ErrorBoundary>
        )}
        {scene === 'loading' && <p className="playground__status">Building the garden…</p>}
        {scene === 'failed' && (
          <p className="playground__status">
            This browser can’t draw the 3D garden. <PageLink href="/">Back to the site</PageLink>
          </p>
        )}
        {selected ? (
          <p className="playground__toast" role="status" key={selected.id}>
            <span>
              <b>{selected.label}</b> · drag to move
            </span>
            <button type="button" onClick={remove}>
              Remove
            </button>
          </p>
        ) : (
          undo && (
            <p className="playground__toast" role="status" key={undo.key}>
              <span>{undo.label} removed</span>
              <button type="button" onClick={putBack}>
                Undo
              </button>
            </p>
          )
        )}
      </div>

      <aside className="playground__panel" aria-labelledby="playground-title">
        <h1 id="playground-title">Garden playground</h1>
        <p className="playground__intro">
          Make it yours. Drag a thing to move it, tap it to take it away, and add more below. Ponds dug next to the lake join it. Drag
          the ground to turn the view; scroll or pinch to zoom.
        </p>
        <div className="playground__actions">
          <button type="button" onClick={() => sceneApi.current?.resetView()} disabled={!ready}>
            Reset view
          </button>
          <button type="button" onClick={startOver} disabled={!ready}>
            Start over
          </button>
        </div>

        <section className="playground__group" aria-label="Add to the garden">
          <h2>Add</h2>
          <div className="playground__add">
            {ADDABLE.map((item) => (
              <button key={item.type} type="button" onClick={() => add(item.type)} disabled={!ready}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="playground__group" aria-label="The plate">
          <h2>Plate</h2>
          <label className="playground__range">
            <span>Size</span>
            <input
              type="range"
              min="0"
              max="4"
              step="0.5"
              value={layout.plate}
              onChange={(e) => resize(Number(e.target.value))}
              disabled={!ready}
            />
          </label>
        </section>

        {PART_GROUPS.map((group) => (
          <section key={group} className="playground__group" aria-label={group}>
            <h2>{group}</h2>
            <ul>
              {PARTS.filter((part) => part.group === group).map((part) => {
                const on = !hidden.has(part.id);
                return (
                  <li key={part.id}>
                    <button type="button" role="switch" aria-checked={on} className="playground__switch" onClick={() => toggle(part.id, !on)}>
                      <span>{part.label}</span>
                      <i aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <div className="playground__share">
          <button type="button" className="btn btn--accent" onClick={copy}>
            Copy link to this garden
          </button>
          <p role="status">{copied}</p>
        </div>
      </aside>
    </main>
  );
}
