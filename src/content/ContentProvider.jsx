'use client';

import { createContext, useContext } from 'react';

// No fallback here: the (site) layout always provides the content, and
// bundling the defaults into the page would ship them twice.
const ContentContext = createContext(null);

// Hands the CMS content, read on the server (app/(site)/layout.jsx), to every
// component of the site.
export function ContentProvider({ content, children }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useContent() needs a <ContentProvider> above it; the (site) layout provides one.');
  return content;
}
