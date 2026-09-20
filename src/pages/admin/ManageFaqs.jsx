import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useData } from '../../context/DataContext'
import { FAQ_PAGES, faqCsv } from '../../utils/contentCsv'
import { newId } from '../../utils/ids'
import faqsSeed from '../../data/faqs.json'

const schema = [
  { key: 'question', label: 'Question', required: true, half: false, placeholder: 'e.g. Do I need to pay brokerage?' },
  { key: 'answer', label: 'Answer', type: 'textarea', required: true, rows: 5, hint: 'Plain text. Shown in the FAQ accordion and in Google’s FAQ rich results.' },
  { key: 'category', label: 'Category', placeholder: 'General, Buying, Loans…', hint: 'For your own organisation.' },
  {
    key: 'pages',
    label: 'Show on these pages',
    type: 'multiselect',
    options: FAQ_PAGES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) })),
    hint: 'A FAQ can appear on several pages. Leave all off to keep it hidden everywhere.',
  },
  { key: 'active', label: 'Active (visible on the website)', type: 'toggle' },
]

export default function ManageFaqs() {
  const { faqs, faqCrud, restoreSeeds } = useData()

  return (
    <CollectionAdmin
      title="FAQs"
      singular="FAQ"
      items={faqs}
      crud={faqCrud}
      schema={schema}
      reorderable
      csv={{ config: faqCsv, seedItems: faqsSeed }}
      restore={() => restoreSeeds('faqs')}
      emptyItem={() => ({ id: newId('f'), question: '', answer: '', category: 'General', pages: ['home'], active: true })}
      duplicate={(f) => ({ ...f, id: newId('f'), question: `${f.question} (copy)`, active: false })}
      searchText={(f) => `${f.question} ${f.answer} ${f.category}`}
      columns={[
        {
          label: 'Question',
          className: 'min-w-[260px]',
          render: (f) => (
            <div>
              <p className="font-medium line-clamp-2">{f.question}</p>
              <p className="text-tertiary text-xs mt-0.5 line-clamp-1">{f.answer}</p>
            </div>
          ),
        },
        { label: 'Category', render: (f) => <span className="text-secondary">{f.category || '—'}</span> },
        {
          label: 'Shown on',
          render: (f) => (
            <div className="flex flex-wrap gap-1">
              {(f.pages ?? []).length === 0 && <span className="text-tertiary text-xs">nowhere</span>}
              {(f.pages ?? []).map((p) => <span key={p} className="glass-weak rounded-full px-2 py-0.5 text-xs capitalize">{p}</span>)}
            </div>
          ),
        },
      ]}
    />
  )
}
