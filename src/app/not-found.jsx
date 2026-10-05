import './not-found.css';

export const metadata = { title: 'Page not found — Runtime Collective', robots: { index: false } };

// Any address that isn't a page, and articles that don't exist (sent with a
// real 404 status).
export default function NotFound() {
  return (
    <div className="not-found">
      <main className="not-found__inner">
        <svg viewBox="0 0 34 40" aria-hidden="true">
          <defs>
            <linearGradient id="not-found-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#A47BFF" />
              <stop offset="1" stopColor="#5B1CFF" />
            </linearGradient>
          </defs>
          <polygon points="1,3 7,0 7,40 1,37" fill="#4D00F2" />
          <polyline points="13,3 26,12 13,21 29,38" fill="none" stroke="url(#not-found-mark)" strokeWidth="6.5" strokeMiterlimit="10" />
        </svg>
        <p className="not-found__code">404</p>
        <h1>This page doesn’t exist</h1>
        <p className="not-found__text">The link may be old, or the address may have a typo.</p>
        <a href="/">Back to the home page</a>
      </main>
    </div>
  );
}
