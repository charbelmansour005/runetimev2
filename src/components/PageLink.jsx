import Link from 'next/link';

// A link to another page of the site changes page without a full reload.
// Links to a section (/#contact), another site, or mail stay plain links.
const isPage = (href) => typeof href === 'string' && /^\/(?!\/)[^#]*$/.test(href);

export default function PageLink({ href, children, ...rest }) {
  if (isPage(href) && !rest.target) {
    return (
      <Link href={href} {...rest}>
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
