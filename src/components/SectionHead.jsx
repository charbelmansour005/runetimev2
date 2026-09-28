import Reveal from './Reveal';

export default function SectionHead({ title, intro, action, tone = 'accent', id }) {
  return (
    <Reveal className="section-head">
      <div className="section-head__row">
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {action && (
          <a className={`btn btn--${tone}`} href={action.href}>
            {action.label}
          </a>
        )}
      </div>
      {intro && <p className="section-intro">{intro}</p>}
    </Reveal>
  );
}
