import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import { Check } from './Icons';
import { useContent } from '../content/ContentProvider';
import './Contact.css';

const FIELDS = ['name', 'email', 'phone', 'company', 'message'];

class SendError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.fields = fields;
  }
}

async function sendMessage(payload) {
  let res;
  try {
    res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new SendError('We couldn’t reach the server. Check your connection and try again, or email us instead.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fields = Object.fromEntries(Object.entries(data.fields ?? {}).filter(([key]) => FIELDS.includes(key)));
    throw new SendError(
      Object.keys(fields).length ? 'Please check the highlighted fields.' : data.error || 'We couldn’t send your message.',
      fields,
    );
  }
}

export default function Contact() {
  const { contact, brand } = useContent();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const formRef = useRef(null);
  const doneRef = useRef(null);
  const returning = useRef(false);

  // After sending, focus moves to the confirmation; "Send another" brings it back.
  useEffect(() => {
    if (status === 'sent') doneRef.current?.focus();
    if (status === 'idle' && returning.current) {
      returning.current = false;
      formRef.current?.elements.name?.focus();
    }
  }, [status]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    setStatus('sending');
    setError('');
    setFieldErrors({});
    setAnnouncement('Sending your message…');
    try {
      await sendMessage(Object.fromEntries(new FormData(form)));
      form.reset();
      setStatus('sent');
      setAnnouncement('Message sent. Thanks, we’ll get back to you shortly.');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields ?? {});
      setStatus('error');
      setAnnouncement('');
      const first = FIELDS.find((key) => err.fields?.[key]);
      if (first) form.elements[first]?.focus();
    }
  };

  // Props that tie a field to its error message.
  const describe = (key, hint) => {
    const ids = [hint, fieldErrors[key] && `contact-${key}-error`].filter(Boolean).join(' ');
    return { 'aria-invalid': fieldErrors[key] ? true : undefined, 'aria-describedby': ids || undefined };
  };
  const fieldError = (key) =>
    fieldErrors[key] && (
      <span className="contact-form__field-error" id={`contact-${key}-error`}>
        {fieldErrors[key]}
      </span>
    );

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

          <p className="sr-only" role="status">
            {announcement}
          </p>

          {status === 'sent' ? (
            <div className="contact-done">
              <span className="contact-done__icon" aria-hidden="true">
                <Check />
              </span>
              <h3 ref={doneRef} tabIndex={-1}>
                Message received.
              </h3>
              <p>Thanks for reaching out — someone from the team will get back to you shortly.</p>
              <button
                type="button"
                className="contact-done__again"
                onClick={() => {
                  returning.current = true;
                  setAnnouncement('');
                  setStatus('idle');
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form ref={formRef} className="contact-form" onSubmit={onSubmit} noValidate={false}>
              <div className="contact-form__row">
                <label className="contact-form__field">
                  <span>Name</span>
                  <input name="name" required maxLength={100} autoComplete="name" {...describe('name')} />
                  {fieldError('name')}
                </label>
                <label className="contact-form__field">
                  <span>Email</span>
                  <input name="email" type="email" required maxLength={200} autoComplete="email" {...describe('email')} />
                  {fieldError('email')}
                </label>
              </div>
              <div className="contact-form__row">
                <label className="contact-form__field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    maxLength={30}
                    pattern="\+?[0-9 \(\)\.\/\-]{7,30}"
                    autoComplete="tel"
                    {...describe('phone', 'contact-phone-hint')}
                  />
                  <span className="contact-form__hint" id="contact-phone-hint">
                    Include the country code.
                  </span>
                  {fieldError('phone')}
                </label>
                <label className="contact-form__field">
                  <span>
                    Company <em>(optional)</em>
                  </span>
                  <input name="company" maxLength={120} autoComplete="organization" {...describe('company')} />
                  {fieldError('company')}
                </label>
              </div>
              <label className="contact-form__field">
                <span>What are you building?</span>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  {...describe('message', 'contact-message-hint')}
                />
                <span className="contact-form__hint" id="contact-message-hint">
                  At least 10 characters.
                </span>
                {fieldError('message')}
              </label>
              {/* Spam trap: hidden from people and assistive tech, filled in by bots. */}
              <label className="contact-form__hp" aria-hidden="true">
                Referral code
                <input name="referral_code" tabIndex={-1} autoComplete="off" />
              </label>
              <div className="contact-form__actions">
                <button className="btn btn--accent btn--lg" type="submit" aria-disabled={status === 'sending'}>
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
