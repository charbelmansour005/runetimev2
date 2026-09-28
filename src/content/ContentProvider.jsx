import { createContext, useContext, useEffect, useState } from 'react';
import { defaultContent } from '../data/content';

const ContentContext = createContext(defaultContent);
// Generous enough for a cold serverless start; the site falls back after this.
const TIMEOUT_MS = 6000;

// Anything missing from the API response falls back to the built-in defaults.
function withDefaults(data) {
  if (!data || typeof data !== 'object') return defaultContent;
  return Object.fromEntries(
    Object.entries(defaultContent).map(([key, fallback]) => {
      const value = data[key];
      return [key, value && typeof value === 'object' ? { ...fallback, ...value } : fallback];
    }),
  );
}

function applySeo({ title, description }) {
  if (title) document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && description) meta.setAttribute('content', description);
}

// Loads the CMS content before rendering the site, so the hero animation is
// built once with the final slides. The dark boot screen matches the hero.
export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    fetch('/api/content', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => active && setContent(withDefaults(data)))
      .catch(() => active && setContent(defaultContent))
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (content) applySeo(content.seo);
  }, [content]);

  if (!content) return <div className="boot" aria-busy="true" aria-label="Loading" />;
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
