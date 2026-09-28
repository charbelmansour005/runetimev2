import { useId } from 'react';

const INK = '#1b0a4a';
const VIOLET = '#4d00f2';
const LIGHT_VIOLET = '#8b5cff';
const line = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' };

const ICONS = {
  web: (g) => (
    <>
      <rect x="5" y="9" width="38" height="30" rx="5" fill={g} {...line} />
      <path d="M5 17h38" fill="none" {...line} />
      <circle cx="10" cy="13" r="1.3" fill={INK} />
      <circle cx="14.5" cy="13" r="1.3" fill={INK} />
      <circle cx="19" cy="13" r="1.3" fill={INK} />
      <path d="M19 23.5 14.5 28l4.5 4.5M29 23.5l4.5 4.5-4.5 4.5" fill="none" stroke={VIOLET} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 22 22 34" stroke={VIOLET} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  mobile: (g) => (
    <>
      <rect x="13" y="4" width="22" height="40" rx="5" fill={g} {...line} />
      <path d="M21 8.5h6" {...line} />
      <rect x="17" y="13" width="14" height="10" rx="2.5" fill={VIOLET} />
      <path d="M17 28h14M17 32.5h9" stroke={LIGHT_VIOLET} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="39.5" r="1.5" fill={INK} />
    </>
  ),
  ai: (g) => (
    <>
      <path
        d="M18 5v6M24 5v6M30 5v6M18 37v6M24 37v6M30 37v6M5 18h6M5 24h6M5 30h6M37 18h6M37 24h6M37 30h6"
        fill="none"
        {...line}
      />
      <rect x="11" y="11" width="26" height="26" rx="6" fill={g} {...line} />
      <path d="M24 16.2l2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2z" fill={VIOLET} />
    </>
  ),
  cloud: (g) => (
    <>
      <path d="M14.5 37h20.5a8 8 0 0 0 1.4-15.9A11.5 11.5 0 0 0 14.8 19a9 9 0 0 0-.3 18z" fill={g} {...line} />
      <path d="M24 32.5V22.5m-4.8 4.6L24 22.3l4.8 4.8" fill="none" stroke={VIOLET} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  design: (g) => (
    <>
      <path d="M24 21 42 30 24 39 6 30z" fill={g} {...line} />
      <path d="M24 14 42 23 24 32 6 23z" fill={g} {...line} />
      <path d="M24 7 42 16 24 25 6 16z" fill={VIOLET} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  team: (g) => (
    <>
      <circle cx="12.5" cy="17" r="4.5" fill={g} {...line} />
      <circle cx="35.5" cy="17" r="4.5" fill={g} {...line} />
      <path d="M4 34.5c0-5 3.8-8.5 8.5-8.5s8.5 3.5 8.5 8.5zM27 34.5c0-5 3.8-8.5 8.5-8.5s8.5 3.5 8.5 8.5z" fill={g} {...line} />
      <circle cx="24" cy="18.5" r="5.8" fill={VIOLET} stroke={INK} strokeWidth="2" />
      <path d="M12.5 41c0-6.8 5.1-11.5 11.5-11.5S35.5 34.2 35.5 41z" fill={VIOLET} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  data: (g) => (
    <>
      <path d="M10 12v24c0 2.8 6.3 5 14 5s14-2.2 14-5V12" fill={g} {...line} />
      <path d="M10 20c0 2.8 6.3 5 14 5s14-2.2 14-5M10 28c0 2.8 6.3 5 14 5s14-2.2 14-5" fill="none" {...line} />
      <ellipse cx="24" cy="12" rx="14" ry="5" fill={VIOLET} stroke={INK} strokeWidth="2" />
    </>
  ),
  qa: (g) => (
    <>
      <path d="M24 4.5 39 10v11c0 9.6-6.3 17.2-15 21.5C15.3 38.2 9 30.6 9 21V10z" fill={g} {...line} />
      <path d="m17 23.5 5 5 9.5-10" fill="none" stroke={VIOLET} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function ServiceIcon({ name }) {
  const id = useId();
  const draw = ICONS[name] ?? ICONS.web;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4dcff" />
        </linearGradient>
      </defs>
      {draw(`url(#${id})`)}
    </svg>
  );
}
