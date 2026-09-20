import { COMPANY } from '../data/company'
import { formatPriceShort } from './seo'

// Copy + numbers for the SEO block under /listings. Everything is computed from
// the current inventory — nothing here is invented.

export function buildListingsFaqs({ heading, filtered, localities }) {
  if (filtered.length === 0) return []
  const prices = filtered.map((p) => p.price).filter((n) => n > 0)
  const faqs = []
  if (prices.length) {
    faqs.push({
      question: `What is the price range of ${heading}?`,
      answer: `Currently ${filtered.length} listing${filtered.length > 1 ? 's' : ''} on ${COMPANY.name} match this search, with prices from ${formatPriceShort(Math.min(...prices))} to ${formatPriceShort(Math.max(...prices))}. Prices change as new properties are added, so check the latest listings above.`,
    })
  }
  if (localities.length) {
    faqs.push({
      question: `Which are the popular localities for ${heading}?`,
      answer: `Localities with the most matching listings right now: ${localities.slice(0, 5).map((l) => l.locality).join(', ')}.`,
    })
  }
  faqs.push(
    {
      question: `How do I choose the right property from ${heading}?`,
      answer: 'Start with a firm budget (use our EMI and budget calculators), shortlist two or three localities, compare properties side by side, visit in person, and verify the RERA registration and ownership documents before paying any token amount.',
    },
    {
      question: 'Should I check the RERA registration before buying?',
      answer: 'Yes. For new projects, the RERA registration number should be searchable on your state RERA portal. Our guide on how to check RERA registration explains the steps.',
    },
    {
      question: `Do I have to pay to contact an agent for ${heading}?`,
      answer: `Searching, saving properties and contacting our team is free. If any brokerage applies to a deal, it is explained and agreed with you up front.`,
    },
  )
  return faqs
}

/** Locality roll-up: listing count + average ₹/sq.ft (Buy) or average rent (Rent). */
export function summariseLocalities(filtered, buy) {
  const map = new Map()
  filtered.forEach((p) => {
    if (!p.locality) return
    const row = map.get(p.locality) || { locality: p.locality, count: 0, sum: 0, n: 0 }
    row.count += 1
    const metric = buy ? (p.areaSqft > 0 && p.price > 0 ? p.price / p.areaSqft : null) : p.price > 0 ? p.price : null
    if (metric) {
      row.sum += metric
      row.n += 1
    }
    map.set(p.locality, row)
  })
  return [...map.values()]
    .map((r) => ({ locality: r.locality, count: r.count, avg: r.n ? r.sum / r.n : 0 }))
    .sort((a, b) => b.count - a.count)
}
