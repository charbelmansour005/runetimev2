import { useCallback, useEffect, useRef, useState } from 'react';
import { LogoMark } from '../components/Logo';
import Account from './Account';
import { api, setUnauthorizedHandler } from './api';
import { IconExternal, IconInbox, IconLogout } from './icons';
import Inbox from './Inbox';
import Login from './Login';
import { SECTION_GROUPS, SECTIONS } from './schema';
import SectionEditor from './SectionEditor';
import './admin.css';

const LEAVE_WARNING = 'You have unsaved changes. Leave this page without saving?';

// Routes: #/content/<section>, #/inbox, #/account
function parseHash() {
  const [view = 'content', key] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (view === 'inbox' || view === 'account') return { view };
  const section = SECTIONS.find((s) => s.key === key) ?? SECTIONS[0];
  return { view: 'content', key: section.key };
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function Shell({ user, onSignedOut }) {
  const route = useHashRoute();
  const [content, setContent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const dirtyRef = useRef(false);

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);
  const onDirtyChange = useCallback((dirty) => {
    dirtyRef.current = dirty;
  }, []);

  useEffect(() => {
    api
      .content()
      .then(setContent)
      .catch((err) => setLoadError(err.message));
    api
      .messages()
      .then((data) => setUnread(data.unread))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const guard = (e) => {
    if (dirtyRef.current && !window.confirm(LEAVE_WARNING)) e.preventDefault();
  };

  const signOut = async () => {
    if (dirtyRef.current && !window.confirm(LEAVE_WARNING)) return;
    dirtyRef.current = false;
    await api.logout().catch(() => {});
    onSignedOut();
  };

  const onSaved = useCallback((key, data) => setContent((c) => ({ ...c, [key]: data })), []);

  let main;
  if (route.view === 'inbox') {
    main = <Inbox onUnreadChange={setUnread} notify={notify} />;
  } else if (route.view === 'account') {
    main = <Account user={user} notify={notify} />;
  } else if (loadError) {
    main = (
      <div className="cms-empty">
        <h2>Couldn’t load the site content</h2>
        <p>{loadError}</p>
      </div>
    );
  } else if (!content) {
    main = <div className="cms-loading" aria-busy="true" />;
  } else {
    const section = SECTIONS.find((s) => s.key === route.key);
    main = (
      <SectionEditor
        key={section.key}
        section={section}
        initial={content[section.key]}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
        notify={notify}
      />
    );
  }

  const isActive = (view, key) => route.view === view && (!key || route.key === key);

  return (
    <div className="cms">
      <aside className="cms-side">
        <div className="cms-side__brand">
          <LogoMark size={28} />
          <div>
            <strong>runtime</strong>
            <span>Content studio</span>
          </div>
        </div>

        <nav className="cms-nav" aria-label="CMS">
          {SECTION_GROUPS.map((group) => (
            <div key={group} className="cms-nav__group">
              <p className="cms-side__label">{group}</p>
              <ul>
                {SECTIONS.filter((s) => s.group === group).map((s) => (
                  <li key={s.key}>
                    <a
                      href={`#/content/${s.key}`}
                      onClick={guard}
                      className={isActive('content', s.key) ? 'is-active' : undefined}
                      aria-current={isActive('content', s.key) ? 'page' : undefined}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="cms-nav__group">
            <p className="cms-side__label">Messages</p>
            <ul>
              <li>
                <a href="#/inbox" onClick={guard} className={isActive('inbox') ? 'is-active' : undefined}>
                  <span className="cms-nav__with-icon">
                    <IconInbox /> Inbox
                  </span>
                  {unread > 0 && <span className="cms-badge">{unread}</span>}
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="cms-side__foot">
          <a className="cms-side__link" href="/" target="_blank" rel="noreferrer">
            <IconExternal /> View live site
          </a>
          <a href="#/account" onClick={guard} className={`cms-side__user${isActive('account') ? ' is-active' : ''}`}>
            <span className="cms-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
            <span className="cms-side__email">{user.email}</span>
          </a>
          <button type="button" className="cms-side__link" onClick={signOut}>
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>

      <main className="cms-main">{main}</main>

      {toast && (
        <div key={toast.id} className={`cms-toast cms-toast--${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    api
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="cms-boot" aria-busy="true" />;
  if (!user) return <Login onSignedIn={setUser} />;
  return <Shell user={user} onSignedOut={() => setUser(null)} />;
}
