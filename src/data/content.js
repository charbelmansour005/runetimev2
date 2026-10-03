// Default site content. The live site loads its content from the CMS
// (/api/content) and falls back to this when the API is unreachable; the API
// also uses it to seed an empty database. Keep the shape in sync with
// server/models/SiteContent.js.

export const defaultContent = {
  seo: {
    title: 'Runtime Collective — Software & AI Engineering',
    description:
      'Runtime Collective is a software & AI engineering studio building web, mobile, AI and cloud products that are built to run.',
  },

  brand: {
    name: 'Runtime Collective',
    tagline: 'Software & AI engineering, built to run.',
    email: 'hello@runtimecollective.com', // TODO: replace with the real inbox
    socials: [
      { label: 'LinkedIn', href: '#', icon: 'linkedin' },
      { label: 'GitHub', href: '#', icon: 'github' },
      { label: 'X', href: '#', icon: 'x' },
    ],
  },

  hero: {
    slides: [
      {
        headline: ['Software & AI', 'Engineering,', 'Built to Run'],
        tabTitle: 'AI & Machine Learning',
        tabText: 'Shipping intelligent features into real products',
      },
      {
        headline: ['Custom Mobile', '& Web App', 'Development'],
        tabTitle: 'Web & Mobile Apps',
        tabText: 'Native, cross-platform and web apps built to scale',
      },
      {
        headline: ['Dedicated', 'Engineering', 'Teams for', 'Global Clients'],
        tabTitle: 'Dedicated Teams',
        tabText: 'A senior collective that plugs into your roadmap',
      },
      {
        headline: ['Cloud & DevOps', 'Platforms That', 'Never Sleep'],
        tabTitle: 'Cloud & DevOps',
        tabText: 'Infrastructure that keeps your runtime up',
      },
    ],
  },

  // Wrap words in **double asterisks** to make them bold.
  about: {
    title: 'An engineering collective for products that have to run',
    paragraphs: [
      'Runtime Collective is a team of senior **Frontend & Backend Engineers**, **Mobile Developers**, **AI Engineers** and product designers. We design, build and run web, mobile, AI and cloud products for startups and enterprises around the world.',
      'We work as an extension of your team: small senior squads, weekly releases, and code that is documented, tested and built to outlive the sprint it was written in.',
    ],
  },

  services: {
    title: 'Our Services',
    intro:
      'From the first prototype to the platform your users rely on every day, we cover every discipline a modern product needs — under one roof and one standard of quality.',
    menuPromo: {
      title: 'Not sure where to start?',
      text: 'Tell us what you are building and we will map the fastest path to launch.',
    },
    items: [
      { icon: 'web', title: 'Web App Development', text: 'React, Next.js and Node platforms engineered for real traffic and long lifespans.' },
      { icon: 'mobile', title: 'Mobile App Development', text: 'iOS, Android and cross-platform apps people actually keep on their home screen.' },
      { icon: 'ai', title: 'AI & Machine Learning', text: 'LLM features, agents and predictive models running reliably in production.' },
      { icon: 'cloud', title: 'Cloud & DevOps', text: 'AWS and GCP architecture, CI/CD, observability and cloud cost control.' },
      { icon: 'design', title: 'UI/UX & Product Design', text: 'Research-led interfaces and design systems that scale with your product.' },
      { icon: 'team', title: 'Dedicated Teams', text: 'Senior squads that plug straight into your roadmap, rituals and tooling.' },
      { icon: 'data', title: 'Data Engineering', text: 'Pipelines, warehouses and dashboards your whole company can trust.' },
      { icon: 'qa', title: 'QA & Test Automation', text: 'Automated suites and release gates, so Friday deploys stop being scary.' },
    ],
  },

  industries: {
    title: 'Industries',
    intro:
      'Our multidisciplinary squads bring domain knowledge along with the code, so we spend your budget on the product — not on learning your industry from scratch.',
    menuPromo: {
      title: 'Your industry isn’t listed?',
      text: 'Most of what we build transfers. Let’s talk about yours.',
    },
    items: [
      {
        name: 'Fintech & Banking',
        visual: 'fintech',
        text: 'Banks and fintechs get secure, compliant digital products that feel as simple as a messaging app.',
        points: ['Digital banking apps', 'Payments & wallets', 'KYC & onboarding', 'Fraud & risk AI'],
      },
      {
        name: 'Healthcare',
        visual: 'health',
        text: 'Connected care platforms that put patient data to work while keeping it private.',
        points: ['Telehealth platforms', 'Remote patient monitoring', 'Clinical dashboards', 'HIPAA-ready cloud'],
      },
      {
        name: 'E-commerce & Retail',
        visual: 'commerce',
        text: 'Fast, headless storefronts and apps that turn traffic spikes into revenue, not outages.',
        points: ['Headless commerce', 'Mobile shopping apps', 'Personalization engines', 'Inventory & OMS'],
      },
      {
        name: 'Logistics & Mobility',
        visual: 'logistics',
        text: 'Real-time tracking and optimization for fleets, warehouses and last-mile delivery.',
        points: ['Fleet tracking', 'Route optimization', 'Driver apps', 'Warehouse systems'],
      },
      {
        name: 'Media & Entertainment',
        visual: 'media',
        text: 'Streaming, publishing and fan experiences built to stay smooth at peak audience.',
        points: ['OTT & streaming', 'Publishing platforms', 'Fan engagement apps', 'Recommendation AI'],
      },
      {
        name: 'SaaS & Startups',
        visual: 'saas',
        text: 'From first MVP to Series B scale — product, platform and team in one collective.',
        points: ['MVP development', 'Multi-tenant platforms', 'Billing & analytics', 'Scale-up architecture'],
      },
    ],
  },

  solutions: {
    title: 'Solutions',
    intro: 'Productized engagements with a clear scope, a fixed team and a date — for the moments where speed matters most.',
    menuPromo: {
      title: 'MVP in 8 weeks',
      text: 'A fixed-scope sprint that ends with a product in real users’ hands.',
    },
    items: [
      { visual: 'mvp', title: 'MVP Sprint', text: 'From idea to a launch-ready product in 8 weeks, with a roadmap for what comes next.' },
      { visual: 'copilot', title: 'AI Copilot Integration', text: 'Assistants and automation built into the product you already have.' },
      { visual: 'modernize', title: 'Legacy Modernization', text: 'Move aging monoliths to modern, cloud-native stacks without downtime.' },
      { visual: 'extend', title: 'Team Extension', text: 'Senior engineers embedded in your team and shipping within two weeks.' },
    ],
  },

  // The real projects, named as agreed (a descriptive title where the app's
  // name can't be used). Their screenshots are uploaded in the CMS; without
  // them each device shows a drawn screen.
  work: {
    title: 'Selected Work',
    intro: 'A few of the products we have designed, built — and still help run.',
    items: [
      {
        name: 'Workshop job tracker',
        excerpt:
          '(Private App) An Arabic-first job tracker for fit-out workshops, with task timers and offline sync from the shop floor to the site.',
        tags: ['mobile', 'ai'],
        bg: '#E6D5C0',
        device: 'phone',
        app: 'fintech',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#7A5537', to: '#5B3E2A', mark: 'W', accent: '#F2B21B' },
      },
      {
        name: 'Travel eSIM app',
        excerpt: 'Travel eSIMs you buy and install in a tap, with live data tracking and top-ups wherever you land.',
        tags: ['mobile', 'ai'],
        bg: '#FFD9D3',
        device: 'phone',
        app: 'health',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#FF625F', to: '#FF486A', mark: 'T', accent: '#FFFFFF' },
      },
      {
        name: 'Social travel app',
        excerpt:
          'A social travel feed for sharing trips as stories and photo posts, with offline maps and group trips on Premium.',
        tags: ['mobile', 'ai'],
        bg: '#E4DCFF',
        device: 'phone',
        app: 'commerce',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#6B48FD', to: '#3C20D2', mark: 'S', accent: '#FFFFFF' },
      },
      {
        name: 'Pharmacy ordering app',
        excerpt:
          'B2B ordering for pharmacies: restock from wholesalers, pay by mobile wallet and track every delivery and invoice.',
        tags: ['mobile', 'ai'],
        bg: '#DDE5F0',
        device: 'phone',
        app: 'logistics',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#2E3D66', to: '#1E2A4A', mark: 'P', accent: '#34D399' },
      },
      {
        name: 'Hajj Medical Center',
        excerpt:
          'A multi-specialty medical center in Naccache, Lebanon, with specialist profiles and online booking across 12 specialties.',
        tags: ['web'],
        bg: '#CDEDE8',
        device: 'laptop',
        app: 'health',
        url: 'https://www.hajjmedical.center',
        image: '',
        imageFit: 'screen',
        icon: { from: '#2FBFAE', to: '#1FA092', mark: 'H', accent: '#FFFFFF' },
      },
      {
        name: 'La Belle Fournée',
        excerpt:
          'Pre-orders for an artisan sourdough bakery: choose your loaves, make them yours and check out from a live order bar.',
        tags: ['web'],
        bg: '#EFE3CC',
        device: 'laptop',
        app: 'commerce',
        url: 'https://labellefournee.vercel.app/',
        image: '',
        imageFit: 'screen',
        icon: { from: '#3A2A1E', to: '#241914', mark: 'B', accent: '#C9A84D' },
      },
    ],
  },

  stack: {
    title: 'Technology We Trust',
    items: [
      'React',
      'Next.js',
      'Node.js',
      'TypeScript',
      'Swift',
      'Kotlin',
      'Flutter',
      'Python',
      'PyTorch',
      'OpenAI',
      'AWS',
      'Google Cloud',
      'Azure',
      'PostgreSQL',
      'MongoDB',
      'Kubernetes',
      'Terraform',
    ],
  },

  // Values like "120+", "98%" or "1M+" count up on scroll; anything else
  // (e.g. "24/7") is shown as written.
  numbers: {
    title: 'The Collective in Numbers',
    intro: 'Senior people, long relationships and products that stay in production for years.',
    items: [
      { value: '5+', label: 'Developers on the team' },
      { value: '100%', label: 'Client retention' },
      { value: '100K+', label: 'Monthly users on our apps' },
    ],
  },

  // Real reviews only, added in the CMS with the client's OK. The section is
  // hidden while there are none.
  reviews: {
    title: 'What Our Clients Say',
    intro: 'What it’s like to work with us, in the words of the people who have.',
    items: [],
  },

  // The articles' text is in src/data/insights/<slug>.md; seeding the database
  // adds it (server/lib/defaults.js), and the site loads it per article.
  insights: {
    title: 'Latest Insights',
    intro: 'Notes from the collective on engineering, AI and shipping products that last.',
    items: [
      {
        title: 'How a rotating headline pushed our LCP to 12.8 seconds',
        slug: 'rotating-hero-lcp',
        date: '2026-10-01',
        tag: 'Performance',
        summary:
          'Every time our hero rotated, Chrome counted the new headline as the page’s largest paint. How we found it, what didn’t fix it, and the 33 KB image that did.',
        url: '',
        art: { from: '#0B2A3A', to: '#0E7490', glow: '#7EE0F0', glyph: 'prompt' },
      },
      {
        title: '8,400 particles, one shader: how our hero morphs',
        slug: 'particle-hero-webgl',
        date: '2026-10-01',
        tag: 'Engineering',
        summary:
          'Our hero was a cloud of particles that rebuilt itself into a new shape for every slide. How we generated the shapes, morphed them on the GPU and kept it from slowing the page down.',
        url: '',
        art: { from: '#2A0A6B', to: '#6D28FF', glow: '#F08BF5', glyph: 'spark' },
      },
      {
        title: 'What it took to make our auto-rotating hero accessible',
        slug: 'accessible-auto-rotating-hero',
        date: '2026-10-01',
        tag: 'Accessibility',
        summary:
          'Carousels have a bad reputation, mostly earned. The changes that made ours work by keyboard, screen reader and touch, from a pause button to one heading that doesn’t move.',
        url: '',
        art: { from: '#14301A', to: '#3F8F3A', glow: '#C6F432', glyph: 'braces' },
      },
      {
        title: 'Why our robots.txt was serving our home page',
        slug: 'spa-real-404s',
        date: '2026-10-01',
        tag: 'SEO',
        summary:
          'One catch-all rewrite sent every unknown URL on our React site to the home page, robots.txt included. How we fixed routing on Vite and Vercel without a framework.',
        url: '',
        art: { from: '#3A0D1E', to: '#BE3455', glow: '#FFB199', glyph: 'code' },
      },
    ],
  },

  contact: {
    title: 'Let’s build what runs next.',
    text: 'Tell us about your product, your timeline and your team. We’ll come back with a plan, not a pitch.',
  },
};
