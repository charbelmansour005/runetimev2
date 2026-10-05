import { Montserrat } from 'next/font/google';
import { siteUrl } from '../../server/config.js';
import '../styles/tokens.css';
import '../styles/global.css';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'Runtime Collective — Software & AI Engineering',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport = { themeColor: '#0D0016' };

export default function RootLayout({ children }) {
  return (
    // data-scroll-behavior: the page uses CSS smooth scrolling for section
    // links; this tells Next to switch it off while it changes pages.
    <html lang="en" className={montserrat.variable} data-scroll-behavior="smooth">
      <body>
        {children}
        {/* Sections fade in with JavaScript; without it they're simply shown. */}
        <noscript>
          <style>{'.reveal { opacity: 1 !important; transform: none !important; }'}</style>
        </noscript>
      </body>
    </html>
  );
}
