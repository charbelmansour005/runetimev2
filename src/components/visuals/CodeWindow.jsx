import { Check } from '../Icons';
import './CodeWindow.css';

// [token type, text] pairs, one array per line.
const LINES = [
  [['kw', 'import'], ['p', ' { '], ['fn', 'collective'], ['p', ' } '], ['kw', 'from'], ['str', " '@runtime/core'"]],
  [],
  [['kw', 'const'], ['v', ' product'], ['p', ' = '], ['fn', 'collective'], ['p', '.'], ['fn', 'assemble'], ['p', '({']],
  [['p', '  squad: ['], ['str', "'product'"], ['p', ', '], ['str', "'design'"], ['p', ', '], ['str', "'web'"], ['p', ', '], ['str', "'ai'"], ['p', '],']],
  [['p', '  stack: ['], ['str', "'react'"], ['p', ', '], ['str', "'node'"], ['p', ', '], ['str', "'swift'"], ['p', ', '], ['str', "'python'"], ['p', '],']],
  [['p', '  cadence: '], ['str', "'weekly'"], ['p', ',']],
  [['p', '});']],
  [],
  [['cm', '// build it once, run it for years']],
  [['kw', 'await'], ['v', ' product'], ['p', '.'], ['fn', 'ship'], ['p', '({ env: '], ['str', "'production'"], ['p', ' });']],
];

export default function CodeWindow() {
  return (
    <div className="code-window" role="img" aria-label="Code editor showing a Runtime project being assembled and shipped to production">
      <div className="code-window__bar">
        <span className="code-window__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="code-window__tab">collective.config.ts</span>
      </div>
      <pre className="code-window__code" aria-hidden="true">
        {LINES.map((tokens, i) => (
          <span className="code-line" key={i}>
            <span className="code-line__no">{i + 1}</span>
            <span className="code-line__text">
              {tokens.map(([type, text], j) => (
                <span key={j} className={`tok tok--${type}`}>
                  {text}
                </span>
              ))}
              {i === LINES.length - 1 && <span className="code-window__cursor" />}
            </span>
          </span>
        ))}
      </pre>
      <div className="code-window__status" aria-hidden="true">
        <span className="code-window__live">
          <i /> production
        </span>
        <span>p95 42ms</span>
        <span>uptime 99.99%</span>
      </div>
      <div className="code-window__toast" aria-hidden="true">
        <span className="code-window__toast-icon">
          <Check />
        </span>
        Deployed · v4.12.0
      </div>
    </div>
  );
}
