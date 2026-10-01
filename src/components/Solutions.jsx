import Reveal from './Reveal';
import SectionHead from './SectionHead';
import SolutionVisual from './visuals/SolutionVisual';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import './Solutions.css';

export default function Solutions() {
  const { solutions } = useContent();
  return (
    <section className="section section--mist" id="solutions" aria-labelledby="solutions-title">
      <div className="container">
        <SectionHead
          id="solutions-title"
          title={solutions.title}
          intro={solutions.intro}
          action={{ label: 'Get a proposal', href: '#contact' }}
        />
        <div className="solutions__grid">
          {solutions.items.map((solution, i) => (
            <Reveal key={itemKey(solution, i)} className="solution-card" delay={(i % 4) * 80}>
              <div className="solution-card__visual" aria-hidden="true">
                <span className="solution-card__tri solution-card__tri--a" />
                <span className="solution-card__tri solution-card__tri--b" />
                <SolutionVisual id={solution.visual} />
              </div>
              <h3 className="solution-card__title">{solution.title}</h3>
              <p className="solution-card__text">{solution.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
