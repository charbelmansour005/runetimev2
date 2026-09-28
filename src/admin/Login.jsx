import { useState } from 'react';
import Logo from '../components/Logo';
import { api } from './api';

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.login(email, password);
      onSignedIn(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="cms-login">
      <form className="cms-login__card" onSubmit={submit}>
        <Logo tone="dark" />
        <div>
          <h1>Content studio</h1>
          <p>Sign in to edit the website.</p>
        </div>
        <label className="cms-login__field">
          <span>Email</span>
          <input
            className="cms-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="cms-login__field">
          <span>Password</span>
          <input
            className="cms-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="cms-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="cms-btn cms-btn--primary cms-btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="cms-login__back" href="/">
          ← Back to the site
        </a>
      </form>
    </div>
  );
}
