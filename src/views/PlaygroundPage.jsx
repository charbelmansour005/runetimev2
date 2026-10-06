'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import Logo from '../components/Logo';
import PageLink from '../components/PageLink';
import { decodeHidden, encodeHidden, PART_GROUPS, PARTS } from '../components/hero/scene/parts';
import './PlaygroundPage.css';

const HeroScene = lazy(() => import('../components/hero/HeroScene'));

const STORE = 'rc-garden-off';
// The whole view is the garden here, mountain included.
const FRAME = {
  centerY: 0.56,
  fill: { x: 0.8, y: 0.74 },
  bounds: { min: { x: -5, y: -1, z: -4 }, max: { x: 5, y: 5.8, z: 4 } },
};
const LABEL =
  '3D garden: a red torii gate in a pond, with a pagoda, a mountain with a waterfall, deer and trees. Drag to turn it, scroll to zoom, or use the arrow keys and the plus and minus keys. Use the switches to show or hide its parts.';
const labelOf = (id) => PARTS.find((part) => part.id === id)?.label ?? id;

// The garden from the home page, with a switch for everything on the plate.
// What's switched off is kept in the browser and in the page's address, so a
// copied link opens the same garden.
export default function PlaygroundPage() {
  const [hidden, setHidden] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false); // the saved choices have been read
  const [scene, setScene] = useState('loading'); // 'loading' | 'ready' | 'failed'
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState('');
  const garden = useRef(null);
  const sceneApi = useRef(null);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  // A link's choices come first, then what this browser remembers.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('off');
    let saved = null;
    try {
      saved = window.localStorage.getItem(STORE);
    } catch {
      // No storage (private window): start with everything.
    }
    setHidden(decodeHidden(fromLink ?? saved ?? ''));
    setLoaded(true);
  }, []);

  const apply = useCallback((set) => {
    for (const part of PARTS) garden.current?.setVisible(part.id, !set.has(part.id));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    apply(hidden);
    const code = encodeHidden(hidden);
    window.history.replaceState(window.history.state, '', code ? `/playground?off=${code}` : '/playground');
    try {
      if (code) window.localStorage.setItem(STORE, code);
      else window.localStorage.removeItem(STORE);
    } catch {
      // Not remembered, then.
    }
  }, [hidden, loaded, apply]);

  const onGarden = useCallback(
    (api) => {
      garden.current = api;
      apply(hiddenRef.current);
    },
    [apply],
  );
  const onReady = useCallback(() => setScene('ready'), []);
  const onFail = useCallback(() => setScene('failed'), []);

  const toggle = (id, on) =>
    setHidden((before) => {
      const next = new Set(before);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });

  // Tapping something in the garden takes it away; the toast offers it back.
  const onPick = useCallback((id) => {
    setHidden((before) => new Set(before).add(id));
    setToast({ id, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('Link copied');
    } catch {
      setCopied('Copy the address from your browser’s bar');
    }
    setTimeout(() => setCopied(''), 4000);
  };

  const shownCount = PARTS.length - hidden.size;
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
        {scene !== 'failed' && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HeroScene
                apiRef={sceneApi}
                split
                frame={FRAME}
                captureWheel
                hint={false}
                label={LABEL}
                onReady={onReady}
                onGarden={onGarden}
                onPick={onPick}
                onFail={onFail}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {scene === 'loading' && <p className="playground__status">Building the garden…</p>}
        {scene === 'failed' && (
          <p className="playground__status">
            This browser can’t draw the 3D garden. <PageLink href="/">Back to the site</PageLink>
          </p>
        )}
        {toast && (
          <p className="playground__toast" role="status" key={toast.key}>
            {labelOf(toast.id)} hidden
            <button
              type="button"
              onClick={() => {
                toggle(toast.id, true);
                setToast(null);
              }}
            >
              Undo
            </button>
          </p>
        )}
      </div>

      <aside className="playground__panel" aria-labelledby="playground-title">
        <h1 id="playground-title">Garden playground</h1>
        <p className="playground__intro">
          Make it yours: switch things off here, or tap them in the garden. Drag to turn it, scroll or pinch to zoom.
        </p>
        <div className="playground__actions">
          <button type="button" onClick={() => setHidden(new Set())} disabled={hidden.size === 0}>
            Show all
          </button>
          <button type="button" onClick={() => setHidden(new Set(PARTS.map((part) => part.id)))} disabled={shownCount === 0}>
            Hide all
          </button>
          <button type="button" onClick={() => sceneApi.current?.resetView()} disabled={scene !== 'ready'}>
            Reset view
          </button>
        </div>
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
