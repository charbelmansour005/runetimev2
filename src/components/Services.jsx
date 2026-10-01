import Reveal from './Reveal';
import SectionHead from './SectionHead';
import ServiceIcon from './visuals/ServiceIcon';
import { useContent } from '../content/ContentProvider';
import { itemKey } from '../content/format';
import './Services.css';

export default function Services() {
  const { services } = useContent();
  return (
    <section className="section section--mist" id="services" aria-labelledby="services-title">
      <div className="container">
        <SectionHead
          id="services-title"
          title={services.title}
          intro={services.intro}
          action={{ label: 'Start a project', href: '#contact' }}
        />
        <div className="services__grid">
          {services.items.map((service, i) => (
            <Reveal key={itemKey(service, i)} className="service-card" delay={(i % 4) * 80}>
              <div className="service-card__icon">
                <span className="shard shard--lilac" aria-hidden="true" />
                <ServiceIcon name={service.icon} />
              </div>
              <h3 className="service-card__title">{service.title}</h3>
              <p className="service-card__text">{service.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
