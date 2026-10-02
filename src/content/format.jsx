// Turns **bold** markers from the CMS into <strong>; everything else stays text.
export function RichText({ text }) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (/^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

// "120+", "98%", "1M+" → { number, suffix } for the count-up; "24/7" → null.
export function parseStat(value) {
  const match = /^(\d{1,9})([+%]|[KMB]\+?|x)?$/i.exec(String(value).trim());
  return match ? { number: Number(match[1]), suffix: match[2] ?? '' } : null;
}

export function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Props for links the CMS may point at another site.
export function linkProps(url, fallback) {
  const href = url || fallback;
  return /^https?:\/\//i.test(href) ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };
}

export const itemKey = (item, index) => item._id ?? index;

// "Sarah Khoury" → "SK": stands in for a missing photo.
export function initials(name) {
  const words = String(name ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  const first = (word) => Array.from(word)[0];
  return (first(words[0]) + (words.length > 1 ? first(words[words.length - 1]) : '')).toUpperCase();
}
