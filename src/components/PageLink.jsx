'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// A link to another page of the site changes page without a full reload.
// Links to a section (/#contact), another site, or mail stay plain links.
const isPage = (href) => typeof href === 'string' && /^\/(?!\/)[^#]*$/.test(href);

export default function PageLink({ href, children, ...rest }) {
  const router = useRouter();
  if (isPage(href) && !rest.target) {
    // Pages aren't fetched ahead just for scrolling past a link (the header
    // alone would fetch two pages on every visit); they are once the visitor
    // shows interest, so the change of page is still instant.
    const warm = () => router.prefetch(href);
    return (
      <Link href={href} prefetch={false} onPointerEnter={warm} onFocus={warm} onTouchStart={warm} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
