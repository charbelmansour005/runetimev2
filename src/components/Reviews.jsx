import Reveal from './Reveal';
import SectionHead from './SectionHead';
import { useContent } from '../content/ContentProvider';
import { initials, itemKey, linkProps, RichText } from '../content/format';
import './Reviews.css';

// Where a review was also posted, named for its link ("View on LinkedIn").
const PLATFORMS = {
  'linkedin.com': 'LinkedIn',
  'clutch.co': 'Clutch',
  'google.com': 'Google',
  'upwork.com': 'Upwork',
  'trustpilot.com': 'Trustpilot',
  'x.com': 'X',
  'twitter.com': 'X',
  'facebook.com': 'Facebook',
};

function platform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const known = Object.keys(PLATFORMS).find((domain) => host === domain || host.endsWith(`.${domain}`));
    return known ? PLATFORMS[known] : host;
  } catch {
    return '';
  }
}

function ReviewCard({ review, delay }) {
  const role = [review.role, review.company].filter(Boolean).join(', ');
  const source = review.url && platform(review.url);
  return (
    <Reveal as="figure" className="review-card" delay={delay}>
      <span className="review-card__mark" aria-hidden="true">
        <span className="shard shard--lilac" />
        <svg viewBox="0 0 24 24">
          <path d="M3.5 6.5h7v6.8L8.2 18H4.9l2.2-4.7H3.5zm10 0h7v6.8L18.2 18h-3.3l2.2-4.7h-3.6z" />
        </svg>
      </span>
      <blockquote className="review-card__quote" cite={review.url || undefined}>
        <p>
          <RichText text={review.quote} />
        </p>
      </blockquote>
      <figcaption className="review-card__person">
        {review.photo ? (
          <img className="review-card__avatar" src={review.photo} alt="" width="48" height="48" loading="lazy" decoding="async" />
        ) : (
          <span className="review-card__avatar" aria-hidden="true">
            {initials(review.name)}
          </span>
        )}
        <span className="review-card__who">
          <span className="review-card__name">{review.name}</span>
          {role && <span className="review-card__role">{role}</span>}
        </span>
      </figcaption>
      {source && (
        <a className="review-card__source" {...linkProps(review.url)}>
          View on {source}
          <span className="sr-only"> (opens in a new tab)</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3h8v8M13 3 3 13" />
          </svg>
        </a>
      )}
    </Reveal>
  );
}

// Clients' words, added in the CMS. Hidden until there's at least one.
export default function Reviews() {
  const { reviews } = useContent();
  if (!reviews.items.length) return null;
  return (
    <section className="section section--mist reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="container">
        <SectionHead id="reviews-title" title={reviews.title} intro={reviews.intro} />
        <div className="reviews__grid">
          {reviews.items.map((review, i) => (
            <ReviewCard key={itemKey(review, i)} review={review} delay={(i % 3) * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}
