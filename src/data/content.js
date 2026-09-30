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

  // `shape` is what the hero's particles form on each slide (see
  // HERO_SHAPE_OPTIONS); `from`/`to` colour them top to bottom and `glow`
  // tints the light behind them.
  hero: {
    slides: [
      {
        headline: ['Software & AI', 'Engineering,', 'Built to Run'],
        tabTitle: 'AI & Machine Learning',
        tabText: 'Shipping intelligent features into real products',
        shape: 'neural',
        glow: '#E36BFF',
        from: '#F08BF5',
        to: '#F7A8B8',
      },
      {
        headline: ['Custom Mobile', '& Web App', 'Development'],
        tabTitle: 'Web & Mobile Apps',
        tabText: 'Native, cross-platform and web apps built to scale',
        shape: 'screens',
        glow: '#8B6BFF',
        from: '#C7B8FA',
        to: '#7C6CF0',
      },
      {
        headline: ['Dedicated', 'Engineering', 'Teams for', 'Global Clients'],
        tabTitle: 'Dedicated Teams',
        tabText: 'A senior collective that plugs into your roadmap',
        shape: 'globe',
        glow: '#5AB8FF',
        from: '#A8C8F5',
        to: '#7EE0F0',
      },
      {
        headline: ['Cloud & DevOps', 'Platforms That', 'Never Sleep'],
        tabTitle: 'Cloud & DevOps',
        tabText: 'Infrastructure that keeps your runtime up',
        shape: 'infinity',
        glow: '#2EE6C8',
        from: '#7DD3FC',
        to: '#2DD4BF',
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

  work: {
    title: 'Selected Work',
    intro: 'A few of the products we have designed, built — and still help run.',
    items: [
      {
        name: 'Ledgerline',
        excerpt: 'A mobile-first neobank with instant onboarding and card controls.',
        tags: ['mobile', 'ai'],
        bg: '#E6F5B0',
        device: 'phone',
        app: 'fintech',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#10233F', to: '#1E3A64', mark: 'L', accent: '#C6F432' },
      },
      {
        name: 'Carevo',
        excerpt: 'Remote patient monitoring for clinics, with AI-assisted triage.',
        tags: ['mobile', 'ai'],
        bg: '#9FC9D1',
        device: 'phone',
        app: 'health',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#E11D48', to: '#FB7185', mark: 'C', accent: '#FFFFFF' },
      },
      {
        name: 'Northwind Market',
        excerpt: 'A headless storefront built for flash-sale traffic.',
        tags: ['web'],
        bg: '#C9A98A',
        device: 'laptop',
        app: 'commerce',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#F97316', to: '#FDBA74', mark: 'N', accent: '#FFFFFF' },
      },
      {
        name: 'Atlas Fleet',
        excerpt: 'Route optimization and live tracking for a regional fleet.',
        tags: ['web', 'ai'],
        bg: '#B5EAD7',
        device: 'phone',
        app: 'logistics',
        url: '',
        image: '',
        imageFit: 'screen',
        icon: { from: '#3730A3', to: '#6366F1', mark: 'A', accent: '#FFFFFF' },
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

  insights: {
    title: 'Latest Insights',
    intro: 'Notes from the collective on engineering, AI and shipping products that last.',
    items: [
      {
        title: 'Shipping LLM features without breaking production',
        date: '2026-09-12',
        tag: 'AI Engineering',
        url: '',
        art: { from: '#2A0A6B', to: '#6D28FF', glow: '#F08BF5', glyph: 'spark' },
      },
      {
        title: 'React Native or fully native in 2026? How we decide',
        date: '2026-08-28',
        tag: 'Mobile',
        url: '',
        art: { from: '#0B2A3A', to: '#0E7490', glow: '#7EE0F0', glyph: 'code' },
      },
      {
        title: 'The real cost of a monolith — and when to keep it',
        date: '2026-08-07',
        tag: 'Architecture',
        url: '',
        art: { from: '#3A0D1E', to: '#BE3455', glow: '#FFB199', glyph: 'braces' },
      },
      {
        title: 'How our dedicated teams onboard in two weeks',
        date: '2026-07-22',
        tag: 'Collective',
        url: '',
        art: { from: '#14301A', to: '#3F8F3A', glow: '#C6F432', glyph: 'prompt' },
      },
    ],
  },

  contact: {
    title: 'Let’s build what runs next.',
    text: 'Tell us about your product, your timeline and your team. We’ll come back with a plan, not a pitch.',
  },
};
