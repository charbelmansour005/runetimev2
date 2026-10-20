import PageLink from './PageLink';
import LitText from './LitText';
import Reveal from './Reveal';

export default function SectionHead({ title, intro, action, tone = 'accent', id }) {
  return (
    <Reveal className="section-head">
      <div className="section-head__row">
        <h2 className="section-title" id={id}>
          <LitText text={title} />
        </h2>
        {action && (
          <PageLink className={`btn btn--${tone}`} href={action.href}>
            {action.label}
          </PageLink>
        )}
      </div>
      {intro && <p className="section-intro">{intro}</p>}
    </Reveal>
  );
}
