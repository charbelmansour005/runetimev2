'use client';

import { createContext, useContext } from 'react';
import { defaultContent } from '../data/content';

const ContentContext = createContext(defaultContent);

// Hands the CMS content, read on the server (app/(site)/layout.jsx), to every
// component of the site.
export function ContentProvider({ content, children }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
