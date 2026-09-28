import './Constellation.css';

const CX = 240;
const CY = 170;
const ROLES = ['iOS', 'Android', 'Web', 'ML', 'DevOps', 'UX', 'QA', 'Data'];
const NODES = ROLES.map((role, i) => {
  const angle = (i / ROLES.length) * Math.PI * 2 - Math.PI / 2;
  return { role, x: CX + Math.cos(angle) * 176, y: CY + Math.sin(angle) * 112 };
});

// "One collective, every discipline": role nodes orbiting the R mark.
export default function Constellation() {
  return (
    <div className="constellation" role="img" aria-label="Every discipline in one team: iOS, Android, web, machine learning, DevOps, UX, QA and data">
      <svg viewBox="0 0 480 340" aria-hidden="true">
        <defs>
          <linearGradient id="cst-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a47bff" />
            <stop offset="1" stopColor="#4d00f2" />
          </linearGradient>
          <radialGradient id="cst-glow">
            <stop offset="0" stopColor="#8b5cff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#8b5cff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={CX} cy={CY} rx="176" ry="112" className="constellation__orbit" />
        <ellipse cx={CX} cy={CY} rx="110" ry="70" className="constellation__orbit constellation__orbit--inner" />

        {NODES.map((n, i) => (
          <line key={`l-${n.role}`} x1={CX} y1={CY} x2={n.x} y2={n.y} className="constellation__link" style={{ animationDelay: `${i * -0.35}s` }} />
        ))}

        <circle cx={CX} cy={CY} r="90" fill="url(#cst-glow)" />
        <circle cx={CX} cy={CY} r="38" fill="url(#cst-core)" className="constellation__core" />
        <g transform={`translate(${CX - 11} ${CY - 17})`}>
          <polygon points="0,3 5,0 5,34 0,31" fill="#fff" />
          <polyline points="10,3 21,10.5 10,18 23,32" fill="none" stroke="#fff" strokeWidth="5" strokeMiterlimit="10" />
        </g>

        {NODES.map((n, i) => (
          <g key={n.role} className="constellation__node" style={{ animationDelay: `${i * 0.4}s` }}>
            <circle cx={n.x} cy={n.y} r="25" />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle">
              {n.role}
            </text>
          </g>
        ))}
      </svg>
      <p className="constellation__caption">One collective. Every discipline.</p>
    </div>
  );
}
