// DEFAULT copy for every editable block of the website. Nothing here is final —
// the admin edits it in Admin → Site Content and the site reads the saved
// version through useSiteContent(). Text can use these tokens, replaced at
// render time: {brand} {ceoName} {ceoTitle} {years}.

import { LEGAL_DEFAULTS } from './legalDefaults.js'

export const HOME_SECTION_LABELS = {
  stats: 'Live stats',
  showcase: '3D home showcase',
  featured: 'Featured properties',
  recommended: 'Picked for you (personalised)',
  budget: 'Budget finder (what can you afford?)',
  newest: 'Newest listings',
  cities: 'Explore by city',
  trends: 'City price trends',
  why: 'Why choose us',
  how: 'How it works',
  popular: 'Popular searches',
  agents: 'Top agents',
  ceo: 'CEO spotlight',
  recent: 'Recently viewed',
  testimonials: 'Testimonials',
  posts: 'Latest blog posts',
  cta: 'List-your-property banner',
  faq: 'FAQ',
}

export const SITE_DEFAULTS = {
  nav: [
    { label: 'Home', to: '/', visible: true, children: [] },
    {
      label: 'Listings',
      to: '/buy',
      visible: true,
      children: [
        { label: 'All Listings', to: '/listings' },
        { label: 'Buy', to: '/buy' },
        { label: 'Rent', to: '/rent' },
        { label: 'Commercial', to: '/buy/commercial' },
      ],
    },
    { label: 'Agents', to: '/agents', visible: true, children: [] },
    {
      label: 'About',
      to: '/about',
      visible: true,
      children: [
        { label: 'About Us', to: '/about' },
        { label: 'Our Team', to: '/team' },
      ],
    },
    { label: 'Blog', to: '/blog', visible: true, children: [] },
    { label: 'Contact', to: '/contact', visible: true, children: [] },
  ],

  home: {
    heroPrefix: 'Find Your Next',
    rotatingWords: ['Home', 'Villa', 'Office', 'Studio'],
    heroSuffix: 'Across India',
    heroSubtitle:
      'Buy or rent 1, 2 & 3 BHK flats, villas and commercial spaces in Mumbai, Delhi, Bangalore, Gurugram & more — verified listings and free expert guidance.',
    sections: Object.keys(HOME_SECTION_LABELS).map((id) => ({ id, enabled: true })),
  },

  showcase: {
    eyebrow: 'Interactive 3D',
    title: 'Step Inside a Modern Home',
    subtitle:
      'Drag to look around, tap the glowing dots to explore, and switch to night to see the house light up. Then browse real homes like this one on {brand}.',
    ctaLabel: 'Browse Homes',
    ctaLink: '/buy',
    hotspots: [
      { label: 'Open living space', text: 'Floor-to-ceiling glass and lots of natural light.' },
      { label: 'Private pool', text: 'Unwind at home — a pool right outside the living room.' },
      { label: 'Landscaped garden', text: 'Green space for kids, pets and family time.' },
      { label: 'Master suite', text: 'A calm upper-floor bedroom with garden views.' },
    ],
  },

  why: {
    title: 'Why Choose {brand}',
    subtitle: 'A platform built on trust, transparency, and local expertise.',
    items: [
      { icon: 'BadgeCheck', title: 'Verified Listings', desc: 'The Verified badge appears only on listings our team has marked verified, and RERA numbers are shown where available.' },
      { icon: 'ShieldCheck', title: 'Trusted Agents', desc: 'Every consultant is approved by our admin team before appearing on the site — and led by a CEO with {years}+ years in real estate.' },
      { icon: 'Wallet', title: 'Transparent Pricing', desc: 'No hidden charges. See the true price, EMI estimates, and fees upfront.' },
      { icon: 'Headphones', title: 'Real People, Real Help', desc: 'Free help with site visits, budgeting and paperwork guidance — call, WhatsApp or send an enquiry any time.' },
    ],
  },

  how: {
    title: 'How It Works',
    subtitle: 'From search to move-in, in four simple steps.',
    steps: [
      { icon: 'Search', title: 'Search', desc: 'Browse verified listings by city, budget, and property type.' },
      { icon: 'CalendarCheck', title: 'Shortlist & Visit', desc: 'Save favorites, compare options, and schedule a site visit.' },
      { icon: 'Send', title: 'Connect', desc: 'Talk directly with a verified agent for pricing and paperwork.' },
      { icon: 'KeyRound', title: 'Move In', desc: 'Complete the deal and get the keys to your new place.' },
    ],
  },

  cta: {
    title: 'Have a Property to Sell or Rent?',
    text: 'List it on {brand} and reach thousands of verified buyers and tenants across India.',
    buttonLabel: 'List My Property',
    link: '/contact?intent=sell',
  },

  about: {
    heroText:
      'We help people buy, rent and sell property across India with clear information, verified listings and honest guidance — led by {ceoName}, who brings {years}+ years of real estate experience.',
    storyTitle: 'Why we exist',
    storyParagraphs: [
      'Searching for a home is stressful when prices are unclear, listings are outdated and every call ends in a sales pitch. {brand} was built to make the process calmer: one place to search, compare, calculate and talk to a real person.',
      'Whether you are a first-time buyer in Gurugram, a tenant in Bangalore or an owner in Mumbai looking for the right buyer, our goal is the same — help you make a confident decision with the facts in front of you.',
    ],
    missionTitle: 'Our mission',
    missionText: 'To make property search in India transparent, verified and free of pressure.',
    missionValues: [
      { icon: 'ShieldCheck', text: 'Transparency — real prices and the full cost picture.' },
      { icon: 'HeartHandshake', text: 'Client first — advice that fits your budget, not ours.' },
      { icon: 'Landmark', text: 'Compliance — we encourage RERA and document checks on every deal.' },
    ],
    servicesTitle: 'What we do',
    servicesSubtitle: 'Everything you need from first search to final paperwork.',
    services: [
      { icon: 'Home', title: 'Buy a Home', desc: 'Apartments, villas, builder floors and penthouses — filter by city, BHK, budget and possession status.' },
      { icon: 'KeyRound', title: 'Rent a Property', desc: 'Furnished and unfurnished homes and commercial spaces for rent, with transparent monthly pricing.' },
      { icon: 'Building2', title: 'Sell or List Your Property', desc: 'Reach serious buyers and tenants. Send us your property details and our team will help you list it.' },
      { icon: 'Calculator', title: 'Budget & Loan Guidance', desc: 'Use our EMI calculator and home-loan budget tool to understand what you can afford before you shortlist.' },
      { icon: 'FileCheck2', title: 'Paperwork Guidance', desc: 'Practical checklists for RERA checks, title documents, stamp duty and registration — in our blog.' },
      { icon: 'TrendingUp', title: 'Compare & Decide', desc: 'Side-by-side property comparison and same-city price insights so you can spot fair pricing.' },
    ],
    trustTitle: 'How we keep listings trustworthy',
    trustSubtitle: 'Trust is earned in the details. Here is what is built into the platform.',
    trust: [
      { title: 'Agents are approved first', desc: 'Property consultants appear on the site only after approval by our admin team.' },
      { title: 'Verified badge is earned', desc: 'A listing shows the “Verified” badge only when our team has marked it verified.' },
      { title: 'RERA number on display', desc: 'Where a project has a RERA registration, the number is shown on the listing so you can check it on the state portal.' },
      { title: 'Fair-price context', desc: 'Price Insight compares a listing with other listings in the same city — never against unrelated markets.' },
    ],
    numbersTitle: 'The platform today',
    numbersSubtitle: 'Live figures from our own inventory — updated automatically as listings change.',
    compliance: [
      '{brand} acts as an intermediary between buyers, tenants, owners and developers. Final terms are agreed directly between the parties.',
      'Prices, availability and specifications can change. Always verify RERA registration and ownership documents before making any payment.',
      'Content on this website is for general information and is not legal, tax or financial advice.',
    ],
    ctaTitle: 'Let’s find your next property',
    ctaText: 'Tell us what you’re looking for and our team will help — no pressure, no obligation.',
  },

  team: {
    title: 'Meet Our Team',
    subtitle: 'Real people, real experience. The team behind {brand} helps you search, verify and decide — without pressure.',
    consultantsTitle: 'Property Consultants',
    consultantsSubtitle: 'Every consultant listed here has been approved by our admin team before appearing on the site.',
    standardsTitle: 'How our team works',
    standards: [
      { title: 'Honest information', desc: 'We share the full price picture — including stamp duty, registration and other costs — before you commit.' },
      { title: 'Paperwork first', desc: 'We encourage every buyer to verify RERA registration and ownership documents before paying any token amount.' },
      { title: 'No pressure', desc: 'Site visits, comparisons and questions are free. You decide when — and whether — to move forward.' },
    ],
    joinTitle: 'Want to join or partner with us?',
    joinText: 'We work with experienced consultants and property owners across India. Tell us about yourself and we’ll get back to you.',
  },

  contact: {
    title: 'Talk to a Property Expert',
    subtitle: 'Buying, renting or selling? Tell us what you need and our team — led by {ceoName} — will guide you. It’s free and there’s no obligation.',
    formTitle: 'Send us your requirement',
    formSubtitle: 'We’ll call you on the number you share. Your details are only used to respond to your enquiry.',
    buttonLabel: 'Get My Free Callback',
    buttonNote: 'Free · no obligation · we aim to call you back within 24 hours.',
    stepsTitle: 'What happens next',
    steps: [
      { title: 'Send your requirement', desc: 'Share what you’re looking for — city, budget and property type help us the most.' },
      { title: 'We call you back', desc: 'A member of our team contacts you on the number you provide. We aim to respond within 24 hours.' },
      { title: 'Shortlist & site visits', desc: 'We share matching options and arrange visits — with no obligation to proceed.' },
    ],
    intents: [
      { value: 'buy', label: 'I want to buy a property' },
      { value: 'rent', label: 'I want to rent a property' },
      { value: 'sell', label: 'I want to sell / list my property' },
      { value: 'loan', label: 'Home-loan & budget guidance' },
      { value: 'partner', label: 'Join / partner with {brand}' },
      { value: 'other', label: 'Something else' },
    ],
  },

  footer: {
    blurb: 'Discover verified homes, rentals and commercial spaces across India. Led by {ceoName}, {ceoTitle} — {years}+ years in real estate.',
    disclaimer:
      '{brand} is an intermediary platform. Prices, availability and specifications are provided by owners, developers and agents and may change — always verify RERA registration and documents before making any payment.',
  },

  forms: {
    buyBudgets: ['Under ₹50 Lakh', '₹50 Lakh – ₹1 Cr', '₹1 Cr – ₹2 Cr', '₹2 Cr – ₹5 Cr', 'Above ₹5 Cr'],
    rentBudgets: ['Under ₹20,000/mo', '₹20,000 – ₹40,000/mo', '₹40,000 – ₹75,000/mo', '₹75,000 – ₹1,50,000/mo', 'Above ₹1,50,000/mo'],
  },

  // Gentle prompt that invites a visitor who has shown real interest (viewed / searched / saved) to
  // create a free account with just a mobile number. Tokens: {focus} = what they have been looking
  // at, e.g. "3 BHK flats for sale in Mumbai". Never shown on /admin, /dashboard or /contact.
  nudge: {
    enabled: true,
    delaySeconds: 8,
    minScore: 4, // 2 = one home viewed, 4 = two, or one saved home
    cooldownDays: 3, // after "Not now" (doubles the second time)
    title: 'Still looking at {focus}?',
    titleFallback: 'Want homes that fit you?',
    text: 'Create a free account with just your mobile number — no password to remember. We use what you have looked at to line up matching homes.',
    buttonLabel: 'Get my matches',
    dismissLabel: 'Not now',
    benefits: [
      'Picks based on the homes you have viewed',
      'A property advisor can WhatsApp you new matches',
      'Book a site visit in one tap — free, no obligation',
      'Saved homes and enquiries in one dashboard',
    ],
    consentText: 'I agree to be contacted by {brand} by call or WhatsApp about homes that match my searches, and to the Privacy Policy. {brand} uses the searches and homes I view on this site to personalise my matches. I can ask to stop at any time.',
  },

  // Property agents: the "I am an agent" option on the sign-up form and the agent panel notices.
  agentProgram: {
    enabled: true,
    registerLabel: 'I am a property agent / dealer',
    title: 'Join as an agent',
    benefits: [
      'Post your own listings from your own agent panel',
      'Reach buyers and tenants searching in your city',
      'Get enquiries on your listings directly',
      'Our team approves your profile and listings before they go live',
    ],
    consentText: 'I confirm my details are true and I hold the registrations the law requires. I agree to the Terms & Conditions and the Privacy Policy, and that my agent profile and approved listings will be shown publicly on {brand}.',
    pendingNotice: 'Your agent account is waiting for approval by our team. You can already prepare listings — they go live after approval.',
    rejectedNotice: 'Your agent registration was not approved, so new listings stay hidden. Please contact us to find out more.',
    listingReviewNote: 'New listings are checked by our team before they appear on the site.',
  },

  // Privacy Policy, Terms & Conditions and Disclaimer pages (see legalDefaults.js).
  legal: LEGAL_DEFAULTS,

  // Internal-linking rules: the first time one of these keywords appears in a blog post or FAQ
  // answer it becomes a link. City names are linked to their /buy/{city} page automatically.
  seo: {
    autoLinkCities: true,
    autoLinks: [
      { keyword: 'RERA', to: '/blog/how-to-check-rera-registration' },
      { keyword: 'stamp duty', to: '/blog/stamp-duty-registration-charges-explained' },
      { keyword: 'home loan', to: '/blog/home-loan-eligibility-emi-explained' },
      { keyword: 'under-construction', to: '/blog/ready-to-move-vs-under-construction' },
      { keyword: 'ready-to-move', to: '/blog/ready-to-move-vs-under-construction' },
      { keyword: 'first-time buyer', to: '/blog/first-time-home-buyer-guide-india' },
    ],
  },

  options: {
    possession: ['Ready to Move', 'Under Construction'],
    furnishing: ['Unfurnished', 'Semi-Furnished', 'Fully-Furnished', 'Bare Shell'],
  },
}

/** Replace {brand} {ceoName} {ceoTitle} {years} in admin-written copy. */
export function fillTokens(text, company) {
  if (typeof text !== 'string' || !company) return text ?? ''
  return text
    .replace(/\{brand\}/g, company.name)
    .replace(/\{ceoName\}/g, company.ceo.name)
    .replace(/\{ceoTitle\}/g, company.ceo.title)
    .replace(/\{years\}/g, String(company.ceo.experienceYears))
}

/** Keeps any home section the admin's saved order doesn't know about yet. */
export function normalizeSections(saved = []) {
  const result = saved.filter((s) => s.id in HOME_SECTION_LABELS)
  const canonical = Object.keys(HOME_SECTION_LABELS)
  // A section added in a later release (e.g. the 3D showcase) is slotted in right after the
  // section that precedes it by default, instead of being dumped at the very bottom.
  canonical.forEach((id, i) => {
    if (result.some((s) => s.id === id)) return
    const prevId = canonical[i - 1]
    const at = prevId ? result.findIndex((s) => s.id === prevId) : -1
    result.splice(at + 1, 0, { id, enabled: true })
  })
  return result
}
