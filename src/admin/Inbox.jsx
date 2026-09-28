import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { IconMail, IconRefresh, IconReply, IconTrash } from './icons';

const when = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Inbox({ onUnreadChange, notify }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.messages();
      setMessages(data.messages);
      onUnreadChange(data.unread);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    load();
  }, [load]);

  const setRead = async (msg, read) => {
    await api.setRead(msg._id, read);
    setMessages((list) => list.map((m) => (m._id === msg._id ? { ...m, read } : m)));
    onUnreadChange((n) => Math.max(0, n + (read ? -1 : 1)));
  };

  const toggle = (msg) => {
    setOpenId((id) => (id === msg._id ? null : msg._id));
    if (!msg.read) setRead(msg, true).catch(() => {});
  };

  const remove = async (msg) => {
    if (!window.confirm(`Delete the message from ${msg.name}? This can’t be undone.`)) return;
    try {
      await api.deleteMessage(msg._id);
      setMessages((list) => list.filter((m) => m._id !== msg._id));
      if (!msg.read) onUnreadChange((n) => Math.max(0, n - 1));
      notify('Message deleted.');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="cms-editor">
      <header className="cms-page-head">
        <div>
          <p className="cms-eyebrow">Messages</p>
          <h1>Inbox</h1>
          <p className="cms-page-desc">Messages sent through the contact form on the site, newest first.</p>
        </div>
        <div className="cms-page-actions">
          <button type="button" className="cms-btn" onClick={load} disabled={loading}>
            <IconRefresh /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="cms-alert" role="alert">
          <strong>{error}</strong>
        </div>
      )}

      {messages && messages.length === 0 && (
        <div className="cms-empty">
          <IconMail width={28} height={28} />
          <h2>No messages yet</h2>
          <p>When someone uses the contact form on the site, their message shows up here.</p>
        </div>
      )}

      {messages && messages.length > 0 && (
        <ul className="cms-inbox">
          {messages.map((msg) => {
            const isOpen = openId === msg._id;
            return (
              <li key={msg._id} className={`cms-msg${msg.read ? '' : ' is-unread'}${isOpen ? ' is-open' : ''}`}>
                <button type="button" className="cms-msg__row" aria-expanded={isOpen} onClick={() => toggle(msg)}>
                  <span className="cms-msg__dot" aria-label={msg.read ? undefined : 'Unread'} />
                  <span className="cms-msg__from">
                    <b>{msg.name}</b>
                    <small>{msg.company ? `${msg.company} · ${msg.email}` : msg.email}</small>
                  </span>
                  <span className="cms-msg__snippet">{msg.message}</span>
                  <time className="cms-msg__date" dateTime={msg.createdAt}>
                    {when(msg.createdAt)}
                  </time>
                </button>
                {isOpen && (
                  <div className="cms-msg__body">
                    <p className="cms-msg__text">{msg.message}</p>
                    <div className="cms-msg__actions">
                      <a
                        className="cms-btn cms-btn--primary"
                        href={`mailto:${msg.email}?subject=${encodeURIComponent('Re: your message to Runtime Collective')}`}
                      >
                        <IconReply /> Reply by email
                      </a>
                      <button type="button" className="cms-btn" onClick={() => setRead(msg, false)}>
                        Mark as unread
                      </button>
                      <button type="button" className="cms-btn cms-btn--danger" onClick={() => remove(msg)}>
                        <IconTrash /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
