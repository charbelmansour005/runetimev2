import CountUp from './CountUp';
import Reveal from './Reveal';
import SectionHead from './SectionHead';
import Constellation from './visuals/Constellation';
import { useContent } from '../content/ContentProvider';
import { itemKey, parseStat } from '../content/format';
import './Numbers.css';

export default function Numbers() {
  const { numbers } = useContent();
  return (
    <section className="section section--dark numbers" aria-labelledby="numbers-title">
      <div className="container numbers__grid">
        <div>
          <SectionHead id="numbers-title" title={numbers.title} intro={numbers.intro} />
          <dl className="numbers__stats">
            {numbers.items.map((stat, i) => {
              const parsed = parseStat(stat.value);
              return (
                <Reveal key={itemKey(stat, i)} className="stat" delay={i * 80}>
                  <dt className="stat__label">{stat.label}</dt>
                  <dd className="stat__value">
                    {parsed ? <CountUp value={parsed.number} suffix={parsed.suffix} /> : stat.value}
                  </dd>
                </Reveal>
              );
            })}
          </dl>
        </div>
        <Reveal className="numbers__visual" delay={150}>
          <span className="shard shard--white numbers__shard" aria-hidden="true" />
          <Constellation />
        </Reveal>
      </div>
    </section>
  );
}
