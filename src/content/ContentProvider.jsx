import { createContext, useContext, useEffect, useState } from "react";
import { defaultContent } from "../data/content";
import { POSTER_SIZES, POSTER_SRCSET } from "../components/hero/poster";

const ContentContext = createContext(defaultContent);
// Generous enough for a cold serverless start; the site falls back after this.
const TIMEOUT_MS = 6000;

// Anything missing from the API response falls back to the built-in defaults.
function withDefaults(data) {
  if (!data || typeof data !== "object") return defaultContent;
  return Object.fromEntries(
    Object.entries(defaultContent).map(([key, fallback]) => {
      const value = data[key];
      return [
        key,
        value && typeof value === "object"
          ? { ...fallback, ...value }
          : fallback,
      ];
    }),
  );
}
//hi
// Loads the CMS content before rendering the site, so the hero animation is
// built once with the final slides. The dark boot screen matches the hero.
export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    // Same request as the preload in index.html, so the browser reuses it.
    fetch("/api/content", { signal: controller.signal })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)),
      )
      .then((data) => active && setContent(withDefaults(data)))
      .catch(() => active && setContent(defaultContent))
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  // Matches the loading screen in index.html (hero background and art on the
  // home page), so nothing jumps while the content arrives.
  if (!content)
    return (
      <div className="boot" role="status">
        <span className="sr-only">Loading</span>
        {window.location.pathname === "/" && (
          <div className="hero__art" aria-hidden="true">
            <div className="hero__sculpture">
              <img
                className="hero__poster"
                src="/hero-poster.webp"
                srcSet={POSTER_SRCSET}
                sizes={POSTER_SIZES}
                alt=""
                width="960"
                height="803"
                fetchPriority="high"
              />
            </div>
          </div>
        )}
      </div>
    );
  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => useContext(ContentContext);
