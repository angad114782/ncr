// Default text of the three legal pages. Everything here is editable in Admin → Site Content →
// Legal pages; the site reads the saved version. Tokens: {brand} {email} {phone} {ceoName}.
//
// A section body is plain text: blank line = new paragraph; lines starting with "- " = bullet list.
//
// IMPORTANT: this is a sensible starting point written for an Indian real-estate intermediary, NOT
// legal advice. Have a lawyer review all three pages (and the consent sentences) before the site
// collects real customer data or lists real properties.

export const LEGAL_DEFAULTS = {
  privacy: {
    title: 'Privacy Policy',
    updated: '2026-09-23',
    intro:
      'We ask for as little as we need. This page explains what {brand} collects, why, who sees it and how you stay in control, in line with the Digital Personal Data Protection Act, 2023 (India).',
    sections: [
      {
        title: 'What we collect',
        body: `Details you give us: your name and mobile number when you create an account; your name, number, e-mail (optional), budget and message when you send an enquiry; and, if you register as an agent, your city, agency name and RERA number.

What you do on this site: the homes you open, the searches and filters you use, homes you save or compare, and how many times you visit. This is kept on your own device (browser storage) and is used to show you relevant homes.

When you create an account and agree, a short summary of that activity (for example "3 BHK flats for sale in Mumbai, budget around ₹1.2 Cr") is added to your enquiry so our team can help you better.

Basic visit data from every visitor, signed in or not: your IP address and, from it, an approximate city/region/pincode (often your internet provider's registered address, not your street address). This is kept at most once per day per address — never a record of which pages you viewed — and is used only for a total-visitor count and to understand roughly where visitors come from.`,
      },
      {
        title: 'Why we use it',
        body: `- To verify your number, run your account and answer your enquiries.
- To contact you by call or WhatsApp about homes that match what you searched for — only if you agreed when you signed up or enquired.
- To show you homes that fit your interests and to improve the website.
- For agents: to review your registration, show your approved profile and listings to visitors, and pass genuine enquiries on your listings to you.`,
      },
      {
        title: 'Who else sees it',
        body: `We do not sell your personal data. It is seen by {brand} staff and by the property consultants who handle your enquiry.

If we switch on advertising measurement (Meta Pixel / Google Ads), those services receive page views and general context such as city, property type or interest level — never your name, phone number or e-mail.

Information you publish (an agent's profile and approved listings) is public by design.`,
      },
      {
        title: 'Your choices and rights',
        body: `- You can withdraw consent, ask what we hold about you, correct it, or ask us to delete it at any time — write to {email}.
- You can clear the browsing preferences kept on your device by clearing this site's data in your browser settings.
- You can reply "stop" to any call or WhatsApp message and we will stop contacting you.`,
      },
      {
        title: 'How long we keep it',
        body: 'We keep account and enquiry details only as long as needed for the purposes above, or as the law requires, and delete them when you ask.',
      },
      {
        title: 'Security',
        body: 'We use reasonable safeguards to protect your information. No website can promise absolute security, so please keep your phone and one-time codes private.',
      },
      {
        title: 'Contact us about your data',
        body: '{brand} · {email} · +91 {phone}',
      },
    ],
  },

  terms: {
    title: 'Terms & Conditions',
    updated: '2026-09-21',
    intro:
      'By using {brand} you agree to these terms. Please read them — they explain what we do, what we expect from you and where our responsibility ends.',
    sections: [
      {
        title: 'Who we are',
        body: '{brand} is an online real-estate platform led by {ceoName}. We are an intermediary: we help buyers, tenants, owners, developers and agents find each other. We are not the seller, landlord or developer of the properties shown, and any deal is made directly between the parties.',
      },
      {
        title: 'Using the website',
        body: `- You must be 18 or older to create an account or send an enquiry.
- Give correct information. One person, one account. Keep your one-time codes private; you are responsible for what happens on your account.
- Do not misuse the site: no scraping, spam, fake enquiries, attempts to break security, or content that is false, misleading, unlawful or offensive.
- We may suspend or remove accounts or content that break these terms.`,
      },
      {
        title: 'Listings and information',
        body: `Listings, prices, photos, areas, availability and specifications are supplied by owners, developers and agents and can change without notice. We try to keep them accurate but do not guarantee it.

A "Verified" badge means our team has checked the details we say we checked — it is not a guarantee of title, approvals or price. Always verify RERA registration, ownership documents and approvals yourself (or through a lawyer) before paying any money.`,
      },
      {
        title: 'Registering as an agent',
        body: `Agents can register from the sign-up form. By registering you confirm that:
- the details you give (name, city, agency, RERA number) are true, and you hold every licence or registration the law requires;
- you will post only properties you are genuinely authorised to market, with accurate price, area, photos and RERA details, and you will not post duplicate, fake or already-sold listings;
- you will respond to enquiries promptly and honestly, and will not misuse enquirers' contact details;
- your profile and listings are reviewed by {brand} before going live, and we may edit, decline, deactivate or remove any profile or listing, or suspend your account, at our discretion (for example for inaccuracy or complaints);
- you are an independent professional — not an employee, partner or agent of {brand}. Any commission or fee is agreed directly between you and your client, and you are responsible for your own taxes and legal compliance.`,
      },
      {
        title: 'Enquiries and communication',
        body: 'When you send an enquiry or create an account and tick the consent box, you agree that {brand} and the agent handling your enquiry may contact you by call, SMS or WhatsApp about it. You can withdraw that consent at any time by telling us to stop.',
      },
      {
        title: 'Our content and your content',
        body: 'The site design, text, logos and software belong to {brand} or its licensors. Content you submit (listings, photos, reviews) stays yours, but you give us a free, worldwide licence to display it on the site and in our marketing for as long as it is listed, and you promise you have the right to share it.',
      },
      {
        title: 'Third-party links and services',
        body: 'The site may link to maps, videos, banks, portals or other sites we do not control. We are not responsible for their content, availability or practices.',
      },
      {
        title: 'Limits of our responsibility',
        body: `The website and all information on it are provided "as is". To the extent the law allows, {brand} is not liable for losses arising from reliance on listings or estimates, from dealings between users, agents and owners, from delays or downtime, or from indirect or consequential loss. Nothing in these terms limits liability that cannot legally be limited.

Please also read our Disclaimer.`,
      },
      {
        title: 'Changes to these terms',
        body: 'We may update these terms from time to time. The date at the top shows when they last changed; continuing to use the site after a change means you accept it.',
      },
      {
        title: 'Governing law and disputes',
        body: 'These terms are governed by the laws of India. Disputes are subject to the courts at the location of {brand}\'s registered office, without affecting any rights you have under consumer or real-estate law.',
      },
      {
        title: 'Contact',
        body: '{brand} · {email} · +91 {phone}',
      },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    updated: '2026-09-21',
    intro:
      'Buying, renting or selling property is a big decision. This page is a plain-language reminder of what this website is — and is not.',
    sections: [
      {
        title: 'General information only',
        body: 'Everything on {brand} — listings, guides, blog posts, calculators, price insights and area statistics — is general information. It is not legal, tax, financial, valuation or investment advice. Speak to a qualified professional before you act on it.',
      },
      {
        title: 'Listings can change',
        body: 'Prices, availability, areas, photos and specifications come from owners, developers and agents and can change or become outdated without notice. Photos and 3D or artistic views are indicative. A listing being online is not an offer or a guarantee that the property is still available.',
      },
      {
        title: 'Check RERA and documents yourself',
        body: `Before paying any token or booking amount:
- check the project and agent on your state's RERA website;
- verify the title deed, encumbrance certificate, approvals and society records;
- get a property lawyer to review the agreement.
We show a RERA number where one is provided, but we do not certify it.`,
      },
      {
        title: 'Estimates and calculators',
        body: 'EMI, loan-eligibility, budget, stamp-duty and "price insight" figures are rough estimates based on the inputs and data available. Actual bank terms, taxes, charges and market prices will differ.',
      },
      {
        title: 'Agents and owners are independent',
        body: '{brand} is an intermediary. Agents, owners and developers listed here act independently; we are not a party to their dealings and do not guarantee their statements, conduct or the outcome of any transaction. Any brokerage or fee is agreed directly with them.',
      },
      {
        title: 'No warranty, limited liability',
        body: 'We work hard to keep the site accurate and available, but we give no warranty that it is error-free or uninterrupted. To the extent the law allows, {brand} is not liable for any loss arising from use of the site or reliance on its content.',
      },
      {
        title: 'Report a problem',
        body: 'Spotted a wrong price, a sold property or a misleading listing? Tell us at {email} or +91 {phone} and we will review it promptly.',
      },
    ],
  },
}
