import './mocks.css';
import './WorkArt.css';

function FintechScreen() {
  return (
    <div className="ws ws--fintech">
      <small>Good morning, Maya</small>
      <b className="ws__big">$12,480</b>
      <div className="ws-fin__card" />
      <div className="ws__rows">
        {['Groceries', 'Transfer', 'Coffee'].map((label, i) => (
          <div className="ws__row" key={label}>
            <i style={{ background: ['#c6f432', '#8b5cff', '#ff6c6c'][i] }} />
            <span>{label}</span>
            <em>-{[42.1, 250, 4.8][i]}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthScreen() {
  return (
    <div className="ws ws--health">
      <small>Today</small>
      <div className="ws-health__rings">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" className="r1 bg" />
          <circle cx="40" cy="40" r="34" className="r1" />
          <circle cx="40" cy="40" r="24" className="r2 bg" />
          <circle cx="40" cy="40" r="24" className="r2" />
          <circle cx="40" cy="40" r="14" className="r3 bg" />
          <circle cx="40" cy="40" r="14" className="r3" />
        </svg>
      </div>
      <div className="ws__rows">
        {[
          ['Heart rate', '72 bpm'],
          ['Steps', '8,240'],
          ['Sleep', '7h 40m'],
        ].map(([k, v]) => (
          <div className="ws__row" key={k}>
            <span>{k}</span>
            <em>{v}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogisticsScreen() {
  return (
    <div className="ws ws--logistics">
      <svg viewBox="0 0 120 150" className="ws-map">
        <rect width="120" height="150" fill="#e9eef5" />
        <path d="M0 40h120M0 100h120M35 0v150M85 0v150" stroke="#fff" strokeWidth="7" />
        <path d="M20 130C30 100 50 110 60 80s30-30 40-60" fill="none" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="20" cy="130" r="5" fill="#4f46e5" />
        <circle cx="100" cy="20" r="6" fill="#ff6c6c" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="ws-logistics__sheet">
        <small>Truck 12 · on route</small>
        <b>ETA 14:32</b>
      </div>
    </div>
  );
}

function CommerceScreen() {
  return (
    <div className="ws-shop">
      <div className="ws-shop__nav">
        <b>northwind</b>
        <span />
        <span />
        <span />
      </div>
      <div className="ws-shop__hero">
        <b>Flash sale</b>
        <small>Up to 40% off</small>
      </div>
      <div className="ws-shop__grid">
        {['#f97316', '#fdba74', '#fb923c', '#fed7aa'].map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

const SCREENS = {
  fintech: FintechScreen,
  health: HealthScreen,
  logistics: LogisticsScreen,
  commerce: CommerceScreen,
};

function AppIcon({ from, to, mark, accent }) {
  return (
    <span className="work-icon" style={{ '--icon-from': from, '--icon-to': to, '--icon-accent': accent }}>
      <b>{mark}</b>
    </span>
  );
}

export default function WorkArt({ item }) {
  const Screen = SCREENS[item.app] ?? FintechScreen;
  return (
    <div className={`work-art work-art--${item.device}`}>
      {item.device === 'laptop' ? (
        <div className="m-laptop work-art__device">
          <div className="m-laptop__screen">
            <div className="m-laptop__view">
              <Screen />
            </div>
          </div>
          <div className="m-laptop__base" />
        </div>
      ) : (
        <div className="m-phone work-art__device">
          <div className="m-phone__screen">
            <Screen />
          </div>
        </div>
      )}
      <AppIcon {...item.icon} />
    </div>
  );
}
