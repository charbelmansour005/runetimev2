'use client';

import { useEffect } from 'react';
import { installSmoothScroll } from '../smoothScroll';

// Turns on the site's gliding wheel scroll (not used by the CMS).
export default function SmoothScroll() {
  useEffect(() => installSmoothScroll(), []);
  return null;
}
