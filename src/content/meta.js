import { useEffect } from 'react';

// Sets the browser tab title and meta description for the page being shown.
export function useDocumentMeta({ title, description }) {
  useEffect(() => {
    if (title) document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute('content', description);
  }, [title, description]);
}
