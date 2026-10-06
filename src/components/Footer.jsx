import Logo from './Logo';
import PageLink from './PageLink';
import { SocialIcon } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Footer.css';

const PRIMARY_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/work' },
  { label: 'Insights', href: '/insights' },
  { label: 'Garden playground', href: '/playground' },
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
          <nav className="footer__grid" aria-label="Footer">
            {columns.map((col) => (
              <div key={col.href} className="footer__col">
                <h2>{col.title}</h2>
                <ul>
                  {col.links.map((link, i) => (
                    <li key={i}>
                      <a href={col.href}>{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="footer__col footer__col--primary">
              <ul>
                {PRIMARY_LINKS.map((link) => (
                  <li key={link.label}>
                    <PageLink href={link.href}>{link.label}</PageLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <div className="footer__socials">
            {/* Placeholder links ("#") stay hidden until a real URL is set in the CMS. */}
            {brand.socials.filter((s) => /^https?:\/\//i.test(s.href)).map((s, i) => (
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
