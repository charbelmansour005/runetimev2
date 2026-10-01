import { useId } from 'react';
import './Logo.css';

// The mark is an angular "R" monogram built from two shards.
export function LogoMark({ size = 32 }) {
  const id = useId();
  return (
    <svg className="logo__mark" viewBox="0 0 34 40" width={(size * 34) / 40} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A47BFF" />
          <stop offset="1" stopColor="#5B1CFF" />
        </linearGradient>
      </defs>
      <polygon points="1,3 7,0 7,40 1,37" fill="#4D00F2" />
      <polyline
        points="13,3 26,12 13,21 29,38"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="6.5"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

export default function Logo({ tone = 'light' }) {
  return (
    <span className={`logo logo--${tone}`}>
      <LogoMark />
      <span className="logo__type">
        <span className="logo__word">runtime</span>{' '}
        <span className="logo__sub">collective</span>
      </span>
    </span>
  );
}
