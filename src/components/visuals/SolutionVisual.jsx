import './mocks.css';
import './SolutionVisual.css';

function Browser({ children, className = '' }) {
  return (
    <div className={`m-browser sv-browser ${className}`}>
      <div className="m-browser__bar">
        <i />
        <i />
        <i />
        <span />
      </div>
      <div className="sv-body">{children}</div>
    </div>
  );
}

function Mvp() {
  const rows = [
    { label: 'Discovery', from: 0, to: 2 },
    { label: 'Design', from: 1, to: 4 },
    { label: 'Build', from: 3, to: 7 },
    { label: 'Launch', from: 7, to: 8, accent: true },
  ];
  return (
    <Browser>
      <div className="sv-gantt">
        <div className="sv-gantt__weeks">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>W{i + 1}</span>
          ))}
        </div>
        {rows.map((r) => (
          <div className="sv-gantt__row" key={r.label}>
            <small>{r.label}</small>
            <div className="sv-gantt__track">
              <span
                className={r.accent ? 'is-accent' : ''}
                style={{ left: `${(r.from / 8) * 100}%`, width: `${((r.to - r.from) / 8) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Browser>
  );
}

function Copilot() {
  return (
    <Browser>
      <div className="sv-chat">
        <p className="sv-chat__msg sv-chat__msg--user">Summarize this week’s churn risks</p>
        <p className="sv-chat__msg sv-chat__msg--ai">
          <span className="sv-chat__spark">✦</span>3 accounts flagged. Top driver: failed payments.
        </p>
        <div className="sv-chat__typing">
          <i />
          <i />
          <i />
        </div>
        <div className="sv-chat__input">Ask Copilot…</div>
      </div>
    </Browser>
  );
}

function Modernize() {
  return (
    <Browser>
      <div className="sv-arch">
        <div className="sv-arch__mono">
          <small>Monolith</small>
        </div>
        <svg className="sv-arch__arrow" viewBox="0 0 30 12">
          <path d="M1 6h26M22 1.5 27 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="sv-arch__services">
          {['auth', 'billing', 'search', 'api'].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
    </Browser>
  );
}

function Extend() {
  const people = [
    ['LM', '#8b5cff'],
    ['JA', '#ff6c6c'],
    ['RK', '#2dd4bf'],
    ['DN', '#f7c948'],
  ];
  return (
    <Browser>
      <div className="sv-call">
        {people.map(([initials, color]) => (
          <div className="sv-call__tile" key={initials}>
            <span style={{ background: color }}>{initials}</span>
          </div>
        ))}
        <span className="sv-call__live">● Standup</span>
      </div>
    </Browser>
  );
}

const VISUALS = { mvp: Mvp, copilot: Copilot, modernize: Modernize, extend: Extend };

export default function SolutionVisual({ id }) {
  const Visual = VISUALS[id] ?? Mvp;
  return <Visual />;
}
