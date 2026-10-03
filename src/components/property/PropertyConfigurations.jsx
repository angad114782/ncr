import { BedDouble } from 'lucide-react'
import { formatPriceShort } from '../../utils/format'

/** A project sold in several sizes: one row per BHK with its area and price. Renders nothing for a single-size listing. */
export default function PropertyConfigurations({ configurations = [], rent = false }) {
  if (configurations.length < 2) return null
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">Available Configurations</h3>
      <div className="glass-weak rounded-[16px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-tertiary text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Area</th>
              <th className="px-4 py-2.5 font-medium text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {configurations.map((c) => (
              <tr key={`${c.beds}-${c.areaSqft}-${c.price}`} className="border-t border-white/10">
                <td className="px-4 py-3 font-medium"><BedDouble size={14} className="inline mr-1.5 -mt-0.5 text-[var(--color-accent)]" />{c.beds} BHK</td>
                <td className="px-4 py-3 text-secondary">{c.areaSqft ? `${c.areaSqft} sq.ft` : '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">{c.price ? `${formatPriceShort(c.price)}${rent ? '/mo' : ''}` : 'On request'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
