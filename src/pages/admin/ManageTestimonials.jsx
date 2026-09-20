import { Star } from 'lucide-react'
import CollectionAdmin from '../../components/admin/CollectionAdmin'
import { useData } from '../../context/DataContext'
import { testimonialCsv } from '../../utils/contentCsv'
import { newId } from '../../utils/ids'
import testimonialsSeed from '../../data/testimonials.json'

const schema = [
  { key: 'name', label: 'Client name', required: true, placeholder: 'Full name' },
  { key: 'city', label: 'City', placeholder: 'Mumbai' },
  { key: 'rating', label: 'Rating (1–5)', type: 'number', min: 1, step: 1 },
  { key: 'text', label: 'What the client said', type: 'textarea', required: true, rows: 4 },
  { key: 'avatar', label: 'Photo (optional)', type: 'image', hint: 'Only use a photo the client agreed to share.' },
  { key: 'active', label: 'Active (visible on the website)', type: 'toggle' },
]

export default function ManageTestimonials() {
  const { testimonials, testimonialCrud, restoreSeeds } = useData()

  return (
    <div className="flex flex-col gap-4">
      <CollectionAdmin
        title="Testimonials"
        singular="testimonial"
        items={testimonials}
        crud={testimonialCrud}
        schema={schema}
        reorderable
        csv={{ config: testimonialCsv, seedItems: testimonialsSeed }}
        restore={() => restoreSeeds('testimonials')}
        emptyItem={() => ({ id: newId('t'), name: '', city: '', rating: 5, text: '', avatar: '', active: true })}
        prepare={(t) => ({ ...t, rating: Math.min(5, Math.max(1, Number(t.rating) || 5)) })}
        duplicate={(t) => ({ ...t, id: newId('t'), active: false })}
        searchText={(t) => `${t.name} ${t.city} ${t.text}`}
        itemLabel={(t) => t.name}
        columns={[
          {
            label: 'Client',
            className: 'min-w-[180px]',
            render: (t) => (
              <div className="flex items-center gap-3">
                {t.avatar ? <img src={t.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full glass-weak flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">{(t.name || '?')[0]}</span>}
                <div><p className="font-medium">{t.name}</p><p className="text-tertiary text-xs">{t.city}</p></div>
              </div>
            ),
          },
          { label: 'Review', className: 'min-w-[260px]', render: (t) => <p className="text-secondary line-clamp-2">{t.text}</p> },
          { label: 'Rating', render: (t) => <span className="flex items-center gap-1"><Star size={13} className="fill-[var(--color-warning)] text-[var(--color-warning)]" /> {t.rating}</span> },
        ]}
      />
      <p className="text-tertiary text-xs max-w-2xl">
        The three bundled reviews are <strong>sample data</strong> and stay inactive. Publish only real reviews from clients who agreed —
        fake reviews break Indian consumer-protection rules and Google’s trust guidelines.
      </p>
    </div>
  )
}
