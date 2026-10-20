'use client';

import { useEffect, useRef } from 'react';

const SCRIPT = 'https://widget.clutch.co/static/js/widget.js';

// Our rating on Clutch (their widget, in an iframe). Their script is only
// fetched when the badge comes near the screen, and is told to look for the
// badge again after a change of page, since it only scans the page once.
export default function ClutchBadge() {
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
  }, []);

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
