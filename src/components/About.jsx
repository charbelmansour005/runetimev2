import Reveal from './Reveal';
import CodeWindow from './visuals/CodeWindow';
import { useContent } from '../content/ContentProvider';
import { RichText } from '../content/format';
import './About.css';

export default function About() {
  const { about } = useContent();
  return (
    <section className="section about" id="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <Reveal className="about__copy">
          <h2 className="section-title" id="about-title">
            {about.title}
          </h2>
          {about.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <RichText text={paragraph} />
            </p>
          ))}
        </Reveal>

        <Reveal className="about__visual" delay={120}>
          <span className="shard shard--ink about__shard" aria-hidden="true" />
          <CodeWindow />
        </Reveal>
      </div>
    </section>
  );
}
