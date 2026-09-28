import { useState } from 'react';
import Reveal from './Reveal';
import { Check } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Contact.css';

async function sendMessage(payload) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldError = data.fields && Object.values(data.fields)[0];
    throw new Error(fieldError || data.error || 'We couldn’t send your message.');
  }
}

export default function Contact() {
  const { contact, brand } = useContent();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('sending');
    setError('');
    try {
      await sendMessage(Object.fromEntries(new FormData(form)));
      form.reset();
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <Reveal className="contact-card">
          <div className="contact-card__copy">
            <h2 id="contact-title">{contact.title}</h2>
            <p>{contact.text}</p>
            <p className="contact-card__alt">
              Prefer email?{' '}
              <a className="contact-card__mail" href={`mailto:${brand.email}`}>
                {brand.email}
              </a>
            </p>
          </div>

          {status === 'sent' ? (
            <div className="contact-done" role="status">
              <span className="contact-done__icon">
                <Check />
              </span>
              <h3>Message received.</h3>
              <p>Thanks for reaching out — someone from the team will get back to you shortly.</p>
              <button type="button" className="contact-done__again" onClick={() => setStatus('idle')}>
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={onSubmit}>
              <div className="contact-form__row">
                <label className="contact-form__field">
                  <span>Name</span>
                  <input name="name" required maxLength={100} autoComplete="name" />
                </label>
                <label className="contact-form__field">
                  <span>Email</span>
                  <input name="email" type="email" required maxLength={200} autoComplete="email" />
                </label>
              </div>
              <label className="contact-form__field">
                <span>
                  Company <em>(optional)</em>
                </span>
                <input name="company" maxLength={120} autoComplete="organization" />
              </label>
              <label className="contact-form__field">
                <span>What are you building?</span>
                <textarea name="message" required minLength={10} maxLength={5000} rows={4} />
              </label>
              {/* Honeypot: hidden from people, tempting for bots. */}
              <label className="contact-form__hp" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <div className="contact-form__actions">
                <button className="btn btn--accent btn--lg" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
                {status === 'error' && (
                  <p className="contact-form__error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </form>
          )}

          <span className="shard contact-card__shard" aria-hidden="true" />
          <span className="shard contact-card__shard contact-card__shard--small" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  );
}
