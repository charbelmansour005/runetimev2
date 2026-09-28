import SectionHead from './SectionHead';
import { useContent } from '../content/ContentProvider';
import './Stack.css';

export default function Stack() {
  const { stack } = useContent();
  return (
    <section className="section section--mist stack" aria-labelledby="stack-title">
      <div className="container">
        <SectionHead id="stack-title" title={stack.title} />
      </div>
      <div className="marquee">
        <ul className="marquee__track" aria-label="Technologies we build with">
          {[...stack.items, ...stack.items].map((name, i) => (
            <li key={`${name}-${i}`} className="marquee__item" aria-hidden={i >= stack.items.length || undefined}>
              <span className="marquee__glyph" aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
