import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import { Arrow, Caret } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Header.css';

// Section links point at the home page, so they also work from /insights.
const NAV = [
  { label: 'Services', href: '/#services', menu: 'services' },
  { label: 'Solutions', href: '/#solutions', menu: 'solutions' },
  { label: 'Industries', href: '/#industries', menu: 'industries' },
  { label: 'Work', href: '/#work' },
  { label: 'Insights', href: '/insights' },
  { label: 'Contact', href: '/#contact' },
];

const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/';

// Dropdown links and promos come from the matching CMS sections.
function useMenus() {
  const { services, solutions, industries } = useContent();
  return {
    services: { items: services.items.map((s) => ({ label: s.title, href: '/#services' })), promo: services.menuPromo },
    solutions: { items: solutions.items.map((s) => ({ label: s.title, href: '/#solutions' })), promo: solutions.menuPromo },
    industries: { items: industries.items.map((i) => ({ label: i.name, href: '/#industries' })), promo: industries.menuPromo },
  };
}

function MegaMenu({ id, menu, onNavigate }) {
  return (
    <div className="mega" id={id}>
      <div className="mega__panel">
        <ul className="mega__list">
          {menu.items.map((item) => (
            <li key={item.label}>
              <a className="mega__link" href={item.href} onClick={onNavigate}>
                <span className="mega__bullet" aria-hidden="true" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mega__promo">
          <p className="mega__promo-title">{menu.promo.title}</p>
          <p className="mega__promo-text">{menu.promo.text}</p>
          <a className="btn btn--accent" href="/#contact" onClick={onNavigate}>
            Start a project <Arrow />
          </a>
        </div>
      </div>
    </div>
  );
}

// Desktop navigation. Dropdowns open on hover, or with their caret button
// (keyboard and touch); Escape, clicking elsewhere or tabbing away closes them.
function DesktopNav({ menus }) {
  const [open, setOpen] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navRef = useRef(null);
  const toggles = useRef({});

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (open) toggles.current[open]?.focus();
      setOpen(null);
      setDismissed(true); // Also hides a menu that is only open because of hover.
    };
    const onPointerDown = (e) => {
      if (!navRef.current?.contains(e.target)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <nav
      ref={navRef}
      className={`nav${dismissed ? ' is-dismissed' : ''}`}
      aria-label="Primary"
      onPointerLeave={() => setDismissed(false)}
    >
      <ul className="nav__list">
        {NAV.map((item) => (
          <li
            key={item.label}
            className={`nav__item${item.menu ? ' has-menu' : ''}${open === item.menu ? ' is-open' : ''}`}
            onBlur={(e) => {
              if (item.menu && open === item.menu && !e.currentTarget.contains(e.relatedTarget)) setOpen(null);
            }}
          >
            <a className="nav__link" href={item.href} aria-current={item.href === currentPath() ? 'page' : undefined}>
              {item.label}
            </a>
            {item.menu && (
              <>
                <button
                  ref={(el) => {
                    toggles.current[item.menu] = el;
                  }}
                  type="button"
                  className="nav__toggle"
                  aria-label={`${item.label} menu`}
                  aria-expanded={open === item.menu}
                  aria-controls={`mega-${item.menu}`}
                  onClick={() => {
                    setDismissed(false);
                    setOpen((v) => (v === item.menu ? null : item.menu));
                  }}
                >
                  <Caret className="nav__caret" />
                </button>
                <MegaMenu id={`mega-${item.menu}`} menu={menus[item.menu]} onNavigate={() => setOpen(null)} />
              </>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileMenu({ open, onClose, menus, menuRef }) {
  const [expanded, setExpanded] = useState(null);
  const { brand } = useContent();

  return (
    <div id="mobile-menu" ref={menuRef} className={`mobile-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <nav aria-label="Primary">
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
                  {/* Collapsed lists are inert, so screen readers skip them too. */}
                  <ul className={`mobile-menu__sub${expanded === item.menu ? ' is-open' : ''}`} inert={expanded !== item.menu}>
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
                <a
                  className="mobile-menu__link"
                  href={item.href}
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  aria-current={item.href === currentPath() ? 'page' : undefined}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <a className="btn btn--primary mobile-menu__cta" href="/#contact" onClick={onClose} tabIndex={open ? 0 : -1}>
        Get in touch
      </a>
      <a className="mobile-menu__mail" href={`mailto:${brand.email}`} tabIndex={open ? 0 : -1}>
        {brand.email}
      </a>
    </div>
  );
}

export default function Header() {
  const menus = useMenus();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The open mobile menu behaves like a dialog: focus moves into it, the page
  // behind it is inert, and closing it returns focus to the menu button.
  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const behind = ['main', 'footer', '.skip-link'].map((s) => document.querySelector(s)).filter(Boolean);
    behind.forEach((el) => el.setAttribute('inert', ''));
    const focusFirst = requestAnimationFrame(() => menuRef.current?.querySelector('a, button')?.focus());

    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    const onResize = () => window.innerWidth > 1024 && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.body.style.overflow = '';
      behind.forEach((el) => el.removeAttribute('inert'));
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      burgerRef.current?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const solid = scrolled && !menuOpen;

  return (
    <header className={`header${solid ? ' is-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="header__inner container">
        <a href="/#top" className="header__logo">
          <Logo tone={solid ? 'dark' : 'light'} />
        </a>

        <DesktopNav menus={menus} />

        <button
          ref={burgerRef}
          type="button"
          className="burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} menus={menus} menuRef={menuRef} />
    </header>
  );
}
