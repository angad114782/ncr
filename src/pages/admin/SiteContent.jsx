import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Download, HardDrive, RotateCcw, Upload } from 'lucide-react'
import GlassCard from '../../components/glass/GlassCard'
import GlassButton from '../../components/glass/GlassButton'
import GlassSheet from '../../components/glass/GlassSheet'
import SchemaForm from '../../components/admin/SchemaForm'
import Toggle from '../../components/admin/Toggle'
import { useData } from '../../context/DataContext'
import { useSettings } from '../../context/SettingsContext'
import { HOME_SECTION_LABELS, normalizeSections } from '../../data/siteDefaults'
import { downloadBackup, restoreBackup } from '../../utils/backup'
import { storageUsageKb } from '../../utils/storageStatus'

const T = 'Supports tokens: {brand} {ceoName} {ceoTitle} {years}'
const iconRow = [
  { key: 'icon', label: 'Icon', type: 'icon' },
  { key: 'title', label: 'Title' },
  { key: 'desc', label: 'Description', type: 'textarea', rows: 2, half: false },
]
const titleDesc = [
  { key: 'title', label: 'Title', half: false },
  { key: 'desc', label: 'Description', type: 'textarea', rows: 2, half: false },
]

function SectionsEditor({ value, set }) {
  const list = normalizeSections(value)
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const n = [...list]
    ;[n[i], n[j]] = [n[j], n[i]]
    set(n)
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-secondary px-1">Home page sections — order & visibility</span>
      {list.map((s, i) => (
        <div key={s.id} className="glass-weak rounded-[14px] px-4 py-2.5 flex items-center gap-3">
          <span className="w-6 text-center text-xs text-tertiary">{i + 1}</span>
          <span className={`flex-1 text-sm font-medium ${s.enabled === false ? 'text-tertiary line-through' : ''}`}>{HOME_SECTION_LABELS[s.id]}</span>
          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="glass w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"><ArrowUp size={13} /></button>
          <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="glass w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"><ArrowDown size={13} /></button>
          <Toggle checked={s.enabled !== false} onChange={(v) => set(list.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))} label={`Show ${HOME_SECTION_LABELS[s.id]}`} />
        </div>
      ))}
      <p className="text-tertiary text-xs px-1">The search hero and running strip always stay at the very top.</p>
    </div>
  )
}

const legalTab = (id, label) => ({
  id: `legal-${id}`,
  label,
  target: 'content',
  intro: `Text of the /${id} page. A section's text: blank line = new paragraph, lines starting with “- ” = bullet list. Tokens: {brand} {email} {phone} {ceoName}. Have a lawyer review this before you collect real customer data.`,
  schema: [
    { key: `legal.${id}.title`, label: 'Page title' },
    { key: `legal.${id}.updated`, label: 'Last updated on', type: 'date', hint: 'Shown at the top. Change it whenever you edit the text.' },
    { key: `legal.${id}.intro`, label: 'Introduction', type: 'textarea', rows: 3 },
    {
      key: `legal.${id}.sections`,
      label: 'Sections',
      type: 'objectList',
      addLabel: 'Add section',
      itemTitle: (x, i) => x.title || `Section ${i + 1}`,
      newItem: () => ({ title: '', body: '' }),
      max: 25,
      fields: [
        { key: 'title', label: 'Heading', half: false },
        { key: 'body', label: 'Text', type: 'textarea', rows: 7 },
      ],
    },
  ],
})

const TABS = [
  {
    id: 'company',
    label: 'Company & CEO',
    target: 'company',
    intro: 'Facts about your business and leadership. Anything left empty (address, RERA number, socials…) is hidden on the website — only add real, verifiable details.',
    schema: [
      { key: 'name', label: 'Brand name', required: true },
      { key: 'tagline', label: 'Tagline' },
      { key: 'foundedYear', label: 'Founded (year)', type: 'number', step: 1 },
      { key: 'reraAgentId', label: 'RERA agent registration no.', hint: 'Shown in the footer and About page.' },
      { key: 'officeHours', label: 'Office hours', placeholder: 'Mon–Sat, 10:00 AM – 7:00 PM' },
      { key: 'address.street', label: 'Address — street' },
      { key: 'address.locality', label: 'Locality' },
      { key: 'address.city', label: 'City' },
      { key: 'address.region', label: 'State' },
      { key: 'address.postalCode', label: 'PIN code' },
      { key: 'social.facebook', label: 'Facebook page URL', type: 'url' },
      { key: 'social.instagram', label: 'Instagram URL', type: 'url' },
      { key: 'social.linkedin', label: 'LinkedIn URL', type: 'url' },
      { key: 'social.youtube', label: 'YouTube URL', type: 'url' },
      { key: 'ceo.name', label: 'CEO / founder name', required: true },
      { key: 'ceo.title', label: 'Title', placeholder: 'CEO' },
      { key: 'ceo.experienceYears', label: 'Years of experience', type: 'number', step: 1, min: 0 },
      { key: 'ceo.photo', label: 'CEO photo', type: 'image', hint: 'Use a real photo — it is a Google trust signal. Initials show until you add one.' },
      { key: 'ceo.summary', label: 'Bio', type: 'textarea', rows: 5 },
      { key: 'ceo.expertise', label: 'Areas of expertise', type: 'stringList' },
      { key: 'ceo.quote', label: 'Quote', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'home',
    label: 'Home page',
    target: 'content',
    intro: 'The hero headline reads: “[prefix] [rotating word] [suffix]”. Choose which sections appear and in what order.',
    schema: [
      { key: 'home.heroPrefix', label: 'Hero headline — start' },
      { key: 'home.heroSuffix', label: 'Hero headline — end' },
      { key: 'home.rotatingWords', label: 'Rotating words', type: 'stringList', max: 8 },
      { key: 'home.heroSubtitle', label: 'Hero sub-text', type: 'textarea', rows: 3 },
      { key: 'home.sections', type: 'custom', render: ({ value, set }) => <SectionsEditor value={value} set={set} /> },
    ],
  },
  {
    id: 'blocks',
    label: 'Home blocks',
    target: 'content',
    intro: `The 3D home showcase, “Why choose us”, “How it works” and the list-your-property banner. ${T}`,
    schema: [
      { key: 'showcase.eyebrow', label: '3D showcase — small heading' },
      { key: 'showcase.title', label: '3D showcase — title' },
      { key: 'showcase.subtitle', label: '3D showcase — text', type: 'textarea', rows: 3 },
      { key: 'showcase.ctaLabel', label: '3D showcase — button' },
      { key: 'showcase.ctaLink', label: '3D showcase — button link', placeholder: '/listings' },
      {
        key: 'showcase.hotspots',
        label: '3D hotspots (glowing dots on the house: living, pool, garden, suite)',
        type: 'objectList',
        max: 4,
        itemTitle: (h, i) => h.label || `Hotspot ${i + 1}`,
        newItem: () => ({ label: '', text: '' }),
        fields: [{ key: 'label', label: 'Label' }, { key: 'text', label: 'Short description', type: 'textarea', rows: 2 }],
      },
      { key: 'why.title', label: 'Why choose us — title' },
      { key: 'why.subtitle', label: 'Subtitle' },
      { key: 'why.items', label: 'Reasons', type: 'objectList', itemTitle: (x) => x.title, newItem: () => ({ icon: 'BadgeCheck', title: '', desc: '' }), fields: iconRow, max: 8 },
      { key: 'how.title', label: 'How it works — title' },
      { key: 'how.subtitle', label: 'Subtitle' },
      { key: 'how.steps', label: 'Steps', type: 'objectList', itemTitle: (x, i) => `${i + 1}. ${x.title}`, newItem: () => ({ icon: 'Search', title: '', desc: '' }), fields: iconRow, max: 8 },
      { key: 'cta.title', label: 'Banner — title', half: false },
      { key: 'cta.text', label: 'Banner — text', type: 'textarea', rows: 2 },
      { key: 'cta.buttonLabel', label: 'Button label' },
      { key: 'cta.link', label: 'Button link', placeholder: '/contact?intent=sell' },
    ],
  },
  {
    id: 'about',
    label: 'About page',
    target: 'content',
    intro: `Everything on /about. ${T}`,
    schema: [
      { key: 'about.heroText', label: 'Intro under the title', type: 'textarea', rows: 3 },
      { key: 'about.storyTitle', label: 'Story — title' },
      { key: 'about.storyParagraphs', label: 'Story paragraphs', type: 'stringList', multiline: true },
      { key: 'about.missionTitle', label: 'Mission — title' },
      { key: 'about.missionText', label: 'Mission statement', type: 'textarea', rows: 2 },
      { key: 'about.missionValues', label: 'Values', type: 'objectList', itemTitle: (x) => x.text, newItem: () => ({ icon: 'ShieldCheck', text: '' }), fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'text', label: 'Text' }], max: 6 },
      { key: 'about.servicesTitle', label: 'Services — title' },
      { key: 'about.servicesSubtitle', label: 'Services — subtitle' },
      { key: 'about.services', label: 'Services', type: 'objectList', itemTitle: (x) => x.title, newItem: () => ({ icon: 'Home', title: '', desc: '' }), fields: iconRow, max: 12 },
      { key: 'about.trustTitle', label: 'Trust — title' },
      { key: 'about.trustSubtitle', label: 'Trust — subtitle' },
      { key: 'about.trust', label: 'Trust points', type: 'objectList', itemTitle: (x) => x.title, newItem: () => ({ title: '', desc: '' }), fields: titleDesc, max: 8 },
      { key: 'about.numbersTitle', label: 'Live numbers — title' },
      { key: 'about.numbersSubtitle', label: 'Live numbers — subtitle' },
      { key: 'about.compliance', label: 'Compliance & disclosures', type: 'stringList', multiline: true },
      { key: 'about.ctaTitle', label: 'Closing banner — title' },
      { key: 'about.ctaText', label: 'Closing banner — text', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'team',
    label: 'Team & Contact',
    target: 'content',
    intro: `Text on /team and /contact. FAQs on these pages are managed in Admin → FAQs (tick the page). ${T}`,
    schema: [
      { key: 'team.title', label: 'Team page — title' },
      { key: 'team.subtitle', label: 'Team page — intro', type: 'textarea', rows: 2 },
      { key: 'team.consultantsTitle', label: 'Consultants — title' },
      { key: 'team.consultantsSubtitle', label: 'Consultants — subtitle' },
      { key: 'team.standardsTitle', label: 'Standards — title' },
      { key: 'team.standards', label: 'How the team works', type: 'objectList', itemTitle: (x) => x.title, newItem: () => ({ title: '', desc: '' }), fields: titleDesc, max: 6 },
      { key: 'team.joinTitle', label: 'Join banner — title' },
      { key: 'team.joinText', label: 'Join banner — text', type: 'textarea', rows: 2 },
      { key: 'contact.title', label: 'Contact page — title' },
      { key: 'contact.subtitle', label: 'Contact page — intro', type: 'textarea', rows: 2 },
      { key: 'contact.formTitle', label: 'Form — title' },
      { key: 'contact.formSubtitle', label: 'Form — sub-text', type: 'textarea', rows: 2 },
      { key: 'contact.buttonLabel', label: 'Form button' },
      { key: 'contact.buttonNote', label: 'Note under the button' },
      { key: 'contact.stepsTitle', label: 'Next-steps — title' },
      { key: 'contact.steps', label: 'Next steps', type: 'objectList', itemTitle: (x, i) => `${i + 1}. ${x.title}`, newItem: () => ({ title: '', desc: '' }), fields: titleDesc, max: 6 },
      { key: 'contact.intents', label: 'Form “I’m interested in” options', type: 'objectList', itemTitle: (x) => x.label, newItem: () => ({ value: '', label: '' }), fields: [{ key: 'value', label: 'Key (no spaces)', placeholder: 'buy' }, { key: 'label', label: 'Label shown' }], max: 10 },
    ],
  },
  {
    id: 'menu',
    label: 'Menu & Footer',
    target: 'content',
    intro: `Top navigation and footer text. Hide a menu item with its switch; add dropdown links under “Sub-links”. ${T}`,
    schema: [
      {
        key: 'nav',
        label: 'Menu items',
        type: 'objectList',
        itemTitle: (x) => x.label,
        newItem: () => ({ label: '', to: '/', visible: true, children: [] }),
        max: 10,
        fields: [
          { key: 'label', label: 'Label' },
          { key: 'to', label: 'Link', placeholder: '/blog' },
          { key: 'visible', label: 'Visible in the menu', type: 'toggle' },
          { key: 'children', label: 'Sub-links (dropdown)', type: 'objectList', itemTitle: (x) => x.label, newItem: () => ({ label: '', to: '/' }), max: 8, fields: [{ key: 'label', label: 'Label' }, { key: 'to', label: 'Link' }] },
        ],
      },
      { key: 'footer.blurb', label: 'Footer description', type: 'textarea', rows: 3 },
      { key: 'footer.disclaimer', label: 'Footer disclaimer', type: 'textarea', rows: 3 },
    ],
  },
  {
    id: 'seo',
    label: 'SEO & links',
    target: 'content',
    intro: 'Automatic internal linking. The first time a keyword appears in a blog post or FAQ answer it becomes a link — so Google (and readers) can move between your important pages without you linking every article by hand.',
    schema: [
      { key: 'seo.autoLinkCities', label: 'Link city names to their “properties for sale” page', type: 'toggle', hint: 'e.g. every first mention of “Mumbai” links to /buy/mumbai.' },
      {
        key: 'seo.autoLinks',
        label: 'Keyword links',
        type: 'objectList',
        itemTitle: (x) => (x.keyword ? `${x.keyword} → ${x.to}` : 'New rule'),
        newItem: () => ({ keyword: '', to: '/' }),
        addLabel: 'Add keyword rule',
        max: 60,
        fields: [
          { key: 'keyword', label: 'Keyword or phrase', placeholder: 'stamp duty' },
          { key: 'to', label: 'Links to', placeholder: '/blog/stamp-duty-registration-charges-explained', hint: 'A page on this site (starts with /) or a full https:// link.' },
        ],
      },
    ],
  },
  legalTab('privacy', 'Privacy Policy'),
  legalTab('terms', 'Terms & Conditions'),
  legalTab('disclaimer', 'Disclaimer'),
  {
    id: 'agentProgram',
    label: 'Agent program',
    target: 'content',
    intro: 'The “I am a property agent” option on the sign-up form, and the messages agents see in their panel. Only promise what your team will actually do. Tokens: {brand}.',
    schema: [
      { key: 'agentProgram.enabled', label: 'Let agents register on the sign-up form', type: 'toggle' },
      { key: 'agentProgram.registerLabel', label: 'Sign-up option label', half: false },
      { key: 'agentProgram.title', label: 'Heading on agent pages' },
      { key: 'agentProgram.benefits', label: 'Benefits shown to agents', type: 'stringList', max: 6 },
      { key: 'agentProgram.consentText', label: 'Agent consent sentence (checkbox)', type: 'textarea', rows: 4 },
      { key: 'agentProgram.pendingNotice', label: 'Notice while the agent awaits approval', type: 'textarea', rows: 2 },
      { key: 'agentProgram.rejectedNotice', label: 'Notice if the agent is rejected', type: 'textarea', rows: 2 },
      { key: 'agentProgram.listingReviewNote', label: 'Note about listing review', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'nudge',
    label: 'Login prompt',
    target: 'content',
    intro: 'A gentle, dismissible card that invites a visitor who has shown real interest (viewed homes, searched, saved a home) to create a free account with their mobile number. It never blocks the page. Use {focus} for what they have been looking at (e.g. “3 BHK flats for sale in Mumbai”) and {brand} for your name. Only promise what your team will actually do.',
    schema: [
      { key: 'nudge.enabled', label: 'Show the login prompt', type: 'toggle' },
      { key: 'nudge.title', label: 'Headline (when we know their interest)', half: false },
      { key: 'nudge.titleFallback', label: 'Headline (otherwise)', half: false },
      { key: 'nudge.text', label: 'Short text', type: 'textarea', rows: 3 },
      { key: 'nudge.buttonLabel', label: 'Button' },
      { key: 'nudge.dismissLabel', label: '“No thanks” link' },
      { key: 'nudge.benefits', label: 'Benefits (also shown in the sign-up form)', type: 'stringList', max: 6, hint: 'Keep them true and specific.' },
      { key: 'nudge.consentText', label: 'Consent sentence shown under the sign-up button', type: 'textarea', rows: 4, hint: 'Required for contacting people (DPDP Act). Keep the meaning.' },
      { key: 'nudge.delaySeconds', label: 'Wait this many seconds first', type: 'number', step: 1, min: 0 },
      { key: 'nudge.minScore', label: 'Interest needed (2 = one home viewed, 4 = two homes or one saved)', type: 'number', step: 1, min: 1 },
      { key: 'nudge.cooldownDays', label: 'Days to stay away after “Not now”', type: 'number', step: 1, min: 0 },
    ],
  },
  {
    id: 'options',
    label: 'Forms & options',
    target: 'content',
    intro: 'Dropdown choices used in forms and filters.',
    schema: [
      { key: 'forms.buyBudgets', label: 'Budget choices — buying', type: 'stringList' },
      { key: 'forms.rentBudgets', label: 'Budget choices — renting', type: 'stringList' },
      { key: 'options.possession', label: 'Possession statuses', type: 'stringList', hint: 'Existing listings keep their saved value.' },
      { key: 'options.furnishing', label: 'Furnishing types', type: 'stringList' },
    ],
  },
]

function BackupTab() {
  const { restoreSeeds } = useData()
  const { resetCompany, resetSiteContent } = useSettings()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(null)
  const kb = storageUsageKb()

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const n = restoreBackup(String(reader.result))
        setMsg(`Restored ${n} collections — reloading…`)
        setTimeout(() => window.location.reload(), 600)
      } catch (err) {
        setMsg(err.message)
      }
    }
    reader.readAsText(file)
  }

  const collections = [['blog', 'Blog posts'], ['faqs', 'FAQs'], ['testimonials', 'Testimonials'], ['agents', 'Agents'], ['properties', 'Listings'], ['inquiries', 'Inquiries']]

  return (
    <div className="flex flex-col gap-6">
      <GlassCard hover={false} className="p-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><HardDrive size={18} className="text-[var(--color-accent)]" /> Backup & move content</h3>
        <p className="text-secondary text-sm mb-4">
          There is no server yet, so everything you edit lives in <strong>this browser</strong>. Download a backup regularly, and use it to move your content to another browser or computer.
          Secrets (WhatsApp token, SMTP password) are never included.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <GlassButton icon={Download} onClick={downloadBackup}>Download backup (JSON)</GlassButton>
          <GlassButton variant="glass" icon={Upload} onClick={() => fileRef.current?.click()}>Restore from backup</GlassButton>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Restore backup file" onChange={onFile} />
        </div>
        {msg && <p role="status" className="mt-3 text-sm text-secondary">{msg}</p>}
        <p className="text-tertiary text-xs mt-4">Browser storage used: <strong>{kb.toLocaleString()} KB</strong> of roughly 5,000 KB. Uploaded images count toward this — image links use none.</p>
      </GlassCard>

      <GlassCard hover={false} className="p-6">
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><RotateCcw size={18} className="text-[var(--color-accent)]" /> Reset to sample content</h3>
        <p className="text-secondary text-sm mb-4">Puts a section back to the content that shipped with the site. Your edits to that section are lost.</p>
        <div className="flex flex-wrap gap-2">
          {collections.map(([key, label]) => (
            <GlassButton key={key} variant="glass" size="sm" onClick={() => setConfirm({ label, run: () => restoreSeeds(key) })}>{label}</GlassButton>
          ))}
          <GlassButton variant="glass" size="sm" onClick={() => setConfirm({ label: 'Company & CEO details', run: resetCompany })}>Company & CEO</GlassButton>
          <GlassButton variant="glass" size="sm" onClick={() => setConfirm({ label: 'All page text (Home, About, Team, Contact, menu, footer)', run: resetSiteContent })}>Page text</GlassButton>
        </div>
      </GlassCard>

      <GlassSheet open={!!confirm} onClose={() => setConfirm(null)} title="Please confirm" maxWidth="max-w-sm">
        {confirm && (
          <div className="flex flex-col gap-5">
            <p className="text-secondary">Reset <strong>{confirm.label}</strong> to the sample content? This can’t be undone.</p>
            <div className="flex gap-2">
              <GlassButton variant="glass" className="flex-1 justify-center" onClick={() => setConfirm(null)}>Cancel</GlassButton>
              <GlassButton variant="danger" className="flex-1 justify-center" onClick={() => { confirm.run(); setConfirm(null); setMsg(`${confirm.label} reset.`) }}>Reset</GlassButton>
            </div>
          </div>
        )}
      </GlassSheet>
    </div>
  )
}

export default function SiteContent() {
  const { company, setCompany, siteContent, setSiteContent } = useSettings()
  const [tab, setTab] = useState('company')
  const [drafts, setDrafts] = useState({ company, content: siteContent })
  const [saved, setSaved] = useState(false)

  const current = TABS.find((t) => t.id === tab)
  const dirty = JSON.stringify(drafts.company) !== JSON.stringify(company) || JSON.stringify(drafts.content) !== JSON.stringify(siteContent)

  const save = (e) => {
    e.preventDefault()
    setCompany(drafts.company)
    setSiteContent(drafts.content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const value = current?.target === 'company' ? drafts.company : drafts.content
  const onChange = (next) => setDrafts((d) => (current.target === 'company' ? { ...d, company: next } : { ...d, content: next }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Site Content</h1>
        <p className="text-secondary">Edit the words, menus and sections of your website — nothing here needs a developer.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...TABS, { id: 'backup', label: 'Backup & reset' }].map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-sm font-medium spring ${tab === t.id ? 'glass-strong text-[var(--color-accent)]' : 'glass-weak text-secondary'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'backup' ? (
        <BackupTab />
      ) : (
        <form onSubmit={save}>
          <GlassCard hover={false} className="p-6 flex flex-col gap-5">
            <p className="text-secondary text-sm">{current.intro}</p>
            <SchemaForm schema={current.schema} value={value} onChange={onChange} />
            <div className="flex items-center gap-3 sticky bottom-3">
              <GlassButton type="submit" className="flex-1 justify-center" disabled={!dirty && !saved}>
                {saved ? <><Check size={16} /> Saved</> : dirty ? 'Save changes' : 'No changes'}
              </GlassButton>
              {dirty && <GlassButton type="button" variant="glass" onClick={() => setDrafts({ company, content: siteContent })}>Discard</GlassButton>}
            </div>
            {dirty && <p className="text-[var(--color-warning)] text-xs -mt-2">You have unsaved changes (they apply to every tab).</p>}
          </GlassCard>
        </form>
      )}
    </div>
  )
}
