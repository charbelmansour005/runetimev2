import { LogoMark } from '../Logo';
import './mocks.css';
import './IndustryVisual.css';

function Fintech() {
  return (
    <div className="iv iv--fintech">
      <span className="shard shard--ink iv__shard" />
      <div className="m-card fin-app">
        <div className="fin-app__head">
          <span className="fin-app__back">←</span>
          <b>Banking</b>
          <span />
        </div>
        <p className="m-label">Available balance</p>
        <p className="fin-app__balance">$12,480.22</p>
        {[
          ['Corner Café', '28 Sep 2026', '-4.80'],
          ['Cloud Storage', '27 Sep 2026', '-9.99'],
          ['Salary', '25 Sep 2026', '+4,250.00'],
        ].map(([name, date, amount]) => (
          <div className="fin-app__row" key={name}>
            <div>
              <b>{name}</b>
              <small>{date}</small>
            </div>
            <em className={amount.startsWith('+') ? 'is-pos' : ''}>{amount} USD</em>
          </div>
        ))}
      </div>
      <div className="fin-card">
        <span className="fin-card__chip" />
        <span className="fin-card__nfc" />
        <span className="fin-card__num">•••• •••• •••• 4291</span>
        <span className="fin-card__name">R. COLLECTIVE</span>
        <span className="fin-card__brand">
          <LogoMark size={26} />
        </span>
      </div>
    </div>
  );
}

function Health() {
  return (
    <div className="iv iv--health">
      <span className="shard shard--white iv__shard" />
      <div className="m-card hl-tablet">
        <div className="hl-tablet__head">
          <b>Patient overview</b>
          <span className="m-live">● Live</span>
        </div>
        <svg className="hl-chart" viewBox="0 0 220 70" preserveAspectRatio="none">
          <polyline points="0,44 22,42 32,22 42,58 52,38 74,40 84,12 94,56 104,36 126,39 136,20 146,50 156,36 178,38 188,24 198,46 208,34 220,36" />
        </svg>
        <div className="hl-kpis">
          <div>
            <small>Heart rate</small>
            <b>72 bpm</b>
          </div>
          <div>
            <small>SpO₂</small>
            <b>98%</b>
          </div>
          <div>
            <small>Sleep</small>
            <b>7h 40m</b>
          </div>
        </div>
      </div>
      <div className="hl-watch">
        <svg viewBox="0 0 80 80" className="hl-watch__ring">
          <circle cx="40" cy="40" r="32" />
          <circle cx="40" cy="40" r="32" className="is-value" />
        </svg>
        <b>72</b>
        <small>BPM</small>
      </div>
    </div>
  );
}

function Commerce() {
  return (
    <div className="iv iv--commerce">
      <span className="shard shard--lavender iv__shard" />
      <div className="m-card cm-product">
        <div className="cm-product__img">
          <span className="cm-product__orb" />
          <span className="cm-product__tag">New</span>
        </div>
        <b>Aurora Speaker</b>
        <small>Midnight violet · 360° sound</small>
        <div className="cm-product__foot">
          <span className="cm-product__price">$149</span>
          <span className="cm-product__btn">Add to cart</span>
        </div>
      </div>
      <div className="m-card cm-toast">
        <span className="cm-toast__icon">✓</span>
        <div>
          <b>Order #4821 confirmed</b>
          <small>Arrives Thursday</small>
        </div>
      </div>
      <span className="cm-cart">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M3 4h2.5l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.4-1.1L21 8H6.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="19.5" r="1.4" fill="currentColor" />
          <circle cx="17" cy="19.5" r="1.4" fill="currentColor" />
        </svg>
        <i>3</i>
      </span>
    </div>
  );
}

function Logistics() {
  return (
    <div className="iv iv--logistics">
      <span className="shard shard--ice iv__shard" />
      <div className="m-card lg-map">
        <svg viewBox="0 0 300 210" className="lg-map__svg">
          <rect width="300" height="210" fill="#eef2f7" />
          <path d="M0 60h300M0 140h300M70 0v210M170 0v210M240 0v210M0 20l120 190M300 30 180 210" stroke="#ffffff" strokeWidth="9" />
          <path d="M-10 175c60-10 90-40 150-35s90 20 170-10" stroke="#d6f0e4" strokeWidth="14" fill="none" />
          <path className="lg-map__route" d="M40 176C70 150 60 110 100 100s110 20 130-30 30-40 30-40" />
          <circle cx="40" cy="176" r="7" fill="#4d00f2" />
          <circle cx="260" cy="30" r="9" fill="#ff6c6c" stroke="#fff" strokeWidth="3" />
          <circle className="lg-map__truck" cx="150" cy="95" r="8" />
        </svg>
      </div>
      <div className="m-card lg-eta">
        <small>Estimated arrival</small>
        <b>14:32</b>
        <span className="m-pill m-pill--ok">On time</span>
      </div>
      <div className="m-card lg-driver">
        <span className="m-avatar">SK</span>
        <div>
          <b>Truck 12 · Sara K.</b>
          <small>3 stops left · 18 km</small>
        </div>
      </div>
    </div>
  );
}

function Media() {
  return (
    <div className="iv iv--media">
      <span className="shard shard--pink iv__shard" />
      <div className="md-player">
        <div className="md-player__screen">
          <span className="md-player__play" />
          <span className="md-player__badge">LIVE</span>
        </div>
        <div className="md-player__bar">
          <span />
        </div>
        <div className="md-player__meta">
          <b>Final Night — Main Stage</b>
          <small>1.2M watching</small>
        </div>
      </div>
      <div className="md-thumbs">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Saas() {
  const bars = [38, 52, 46, 64, 58, 76, 70, 92];
  return (
    <div className="iv iv--saas">
      <span className="shard shard--aqua iv__shard" />
      <div className="m-card ss-dash">
        <div className="ss-dash__head">
          <div>
            <small className="m-label">MRR</small>
            <b className="ss-dash__value">$48.2k</b>
          </div>
          <span className="m-pill m-pill--ok">+12.4%</span>
        </div>
        <div className="ss-dash__bars">
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="ss-dash__axis">
          {['Jan', 'Mar', 'May', 'Jul'].map((m) => (
            <small key={m}>{m}</small>
          ))}
        </div>
      </div>
      <div className="m-card ss-chip">
        <b>3.4×</b>
        <small>faster releases</small>
      </div>
    </div>
  );
}

const VISUALS = {
  fintech: Fintech,
  health: Health,
  commerce: Commerce,
  logistics: Logistics,
  media: Media,
  saas: Saas,
};

export default function IndustryVisual({ id }) {
  const Visual = VISUALS[id] ?? Fintech;
  return <Visual />;
}
