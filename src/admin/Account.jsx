import { useState } from 'react';
import { api } from './api';

const EMPTY = { current: '', next: '', confirm: '' };

export default function Account({ user, notify }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.next.length < 10) return setError('Use at least 10 characters for the new password.');
    if (form.next !== form.confirm) return setError('The new passwords don’t match.');
    setSaving(true);
    setError('');
    try {
      await api.changePassword(form.current, form.next);
      setForm(EMPTY);
      notify('Password updated. Other sessions were signed out.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="cms-editor">
      <header className="cms-page-head">
        <div>
          <p className="cms-eyebrow">Settings</p>
          <h1>Account</h1>
          <p className="cms-page-desc">
            Signed in as <b>{user.email}</b>.
          </p>
        </div>
      </header>

      <form className="cms-card cms-account" onSubmit={submit}>
        <h2>Change password</h2>
        <div className="cms-fields">
          <div className="cms-field cms-field--full">
            <label className="cms-label" htmlFor="pw-current">
              Current password
            </label>
            <input id="pw-current" className="cms-input" type="password" autoComplete="current-password" required value={form.current} onChange={set('current')} />
          </div>
          <div className="cms-field cms-field--half">
            <label className="cms-label" htmlFor="pw-next">
              New password
            </label>
            <input id="pw-next" className="cms-input" type="password" autoComplete="new-password" required minLength={10} value={form.next} onChange={set('next')} />
          </div>
          <div className="cms-field cms-field--half">
            <label className="cms-label" htmlFor="pw-confirm">
              Confirm new password
            </label>
            <input id="pw-confirm" className="cms-input" type="password" autoComplete="new-password" required minLength={10} value={form.confirm} onChange={set('confirm')} />
          </div>
        </div>
        {error && (
          <p className="cms-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="cms-btn cms-btn--primary" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
