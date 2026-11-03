'use client';

import { useEffect, useRef } from 'react';

const SCRIPT = 'https://widget.clutch.co/static/js/widget.js';

// Our rating on Clutch (their widget, in an iframe). Their script is only
// fetched when the badge comes near the screen, and is told to look for the
// badge again after a change of page, since it only scans the page once.
//
// With `whenIdle` (the hero's, which is on screen straight away) it waits for
// the page to finish loading and go quiet first, so it never competes with
// the first paint.
export default function ClutchBadge({ whenIdle = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const start = () => {
      if (window.CLUTCHCO?.Init) {
        if (el.querySelector('iframe')) return;
        window.CLUTCHCO.Init();
        return;
      }
      if (document.querySelector(`script[src="${SCRIPT}"]`)) return;
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      // (It looks for badges when the page loads, which has long passed.)
      script.onload = () => {
        if (!ref.current?.querySelector('iframe')) window.CLUTCHCO?.Init();
      };
      document.body.appendChild(script);
    };
    if (whenIdle) {
      let timer = 0;
      let idle = 0;
      const later = () => {
        timer = window.setTimeout(() => {
          idle = (window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 200)))(start, { timeout: 3000 });
        }, 2500);
      };
      if (document.readyState === 'complete') later();
      else window.addEventListener('load', later, { once: true });
      return () => {
        window.removeEventListener('load', later);
        window.clearTimeout(timer);
        (window.cancelIdleCallback ?? window.clearTimeout)(idle);
      };
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        start();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [whenIdle]);

  return (
    <div
      ref={ref}
      className="clutch-widget"
      data-url="https://widget.clutch.co"
      data-widget-type="2"
      data-height="45"
      data-nofollow="false"
      data-expandifr="true"
      data-scale="100"
      data-darkbg="1"
      data-clutchcompany-id="2736591"
    />
  );
}
