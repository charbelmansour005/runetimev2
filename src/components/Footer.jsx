import Logo from './Logo';
import { SocialIcon } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Footer.css';

const PRIMARY_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/#work' },
  { label: 'Insights', href: '/insights' },
  { label: 'Contact', href: '/#contact' },
];

export default function Footer() {
  const { brand, services, solutions, industries } = useContent();
  const columns = [
    { title: 'Services', href: '/#services', links: services.items.map((s) => s.title) },
    { title: 'Solutions', href: '/#solutions', links: solutions.items.map((s) => s.title) },
    { title: 'Industries', href: '/#industries', links: industries.items.map((i) => i.name) },
  ];
  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="container">
          <div className="footer__top">
            <Logo />
            <p>{brand.tagline}</p>
          </div>
          <div className="footer__grid">
            {columns.map((col) => (
              <nav key={col.href} className="footer__col" aria-label={col.title}>
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((link, i) => (
                    <li key={i}>
                      <a href={col.href}>{link}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav className="footer__col footer__col--primary" aria-label="Site">
              <ul>
                {PRIMARY_LINKS.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <div className="footer__socials">
            {brand.socials.map((s, i) => (
              <a key={s._id ?? i} href={s.href} aria-label={s.label}>
                <SocialIcon name={s.icon} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
