import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

export default function CountUp({ value, suffix = '', duration = 2000 }) {
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(value);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          setCurrent(Math.round(easeOutCubic(t) * value));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref}>
      <span aria-hidden="true">
        {current.toLocaleString('en-US')}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString('en-US')}
        {suffix}
      </span>
    </span>
  );
}
