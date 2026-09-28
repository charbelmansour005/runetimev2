import { useEffect, useState } from 'react';
import Logo from './Logo';
import { Arrow, Caret } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Header.css';

const NAV = [
  { label: 'Services', href: '#services', menu: 'services' },
  { label: 'Solutions', href: '#solutions', menu: 'solutions' },
  { label: 'Industries', href: '#industries', menu: 'industries' },
  { label: 'Work', href: '#work' },
  { label: 'Contact', href: '#contact' },
];

// Dropdown links and promos come from the matching CMS sections.
function useMenus() {
  const { services, solutions, industries } = useContent();
  return {
    services: { items: services.items.map((s) => ({ label: s.title, href: '#services' })), promo: services.menuPromo },
    solutions: { items: solutions.items.map((s) => ({ label: s.title, href: '#solutions' })), promo: solutions.menuPromo },
    industries: { items: industries.items.map((i) => ({ label: i.name, href: '#industries' })), promo: industries.menuPromo },
  };
}

function MegaMenu({ menu }) {
  return (
    <div className="mega">
      <div className="mega__panel">
        <ul className="mega__list">
          {menu.items.map((item) => (
            <li key={item.label}>
              <a className="mega__link" href={item.href}>
                <span className="mega__bullet" aria-hidden="true" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mega__promo">
          <p className="mega__promo-title">{menu.promo.title}</p>
          <p className="mega__promo-text">{menu.promo.text}</p>
          <a className="btn btn--accent" href="#contact">
            Start a project <Arrow />
          </a>
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose, menus }) {
  const [expanded, setExpanded] = useState(null);
  const { brand } = useContent();

  return (
    <div className={`mobile-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <ul className="mobile-menu__list">
        {NAV.map((item) => (
          <li key={item.label} className="mobile-menu__item">
            {item.menu ? (
              <>
                <button
                  type="button"
                  className="mobile-menu__link"
                  aria-expanded={expanded === item.menu}
                  onClick={() => setExpanded((v) => (v === item.menu ? null : item.menu))}
                  tabIndex={open ? 0 : -1}
                >
                  {item.label}
                  <Caret className="mobile-menu__caret" />
                </button>
                <ul className={`mobile-menu__sub${expanded === item.menu ? ' is-open' : ''}`}>
                  {menus[item.menu].items.map((sub) => (
                    <li key={sub.label}>
                      <a href={sub.href} onClick={onClose} tabIndex={open && expanded === item.menu ? 0 : -1}>
                        {sub.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <a className="mobile-menu__link" href={item.href} onClick={onClose} tabIndex={open ? 0 : -1}>
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
      <a className="btn btn--primary mobile-menu__cta" href="#contact" onClick={onClose} tabIndex={open ? 0 : -1}>
        Get in touch
      </a>
      <a className="mobile-menu__mail" href={`mailto:${brand.email}`} tabIndex={open ? 0 : -1}>
        {brand.email}
      </a>
    </div>
  );
}

export default function Header() {
  const { brand } = useContent();
  const menus = useMenus();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    const onResize = () => window.innerWidth > 1024 && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  const solid = scrolled && !menuOpen;

  return (
    <header className={`header${solid ? ' is-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="header__inner container">
        <a href="#top" className="header__logo" aria-label={`${brand.name} — back to top`}>
          <Logo tone={solid ? 'dark' : 'light'} />
        </a>

        <nav className="nav" aria-label="Primary">
          <ul className="nav__list">
            {NAV.map((item) => (
              <li key={item.label} className={`nav__item${item.menu ? ' has-menu' : ''}`}>
                <a className="nav__link" href={item.href}>
                  {item.label}
                  {item.menu && <Caret className="nav__caret" />}
                </a>
                {item.menu && <MegaMenu menu={menus[item.menu]} />}
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} menus={menus} />
    </header>
  );
}
