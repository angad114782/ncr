import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import GlassButton from '../glass/GlassButton'
import PropertyCard from '../property/PropertyCard'
import { useData } from '../../context/DataContext'

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))
}

function formatCompact(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`
  return `₹${formatINR(n)}`
}

// Standard bank underwriting assumption: EMI shouldn't exceed ~40% of monthly
// income (FOIR), and loans typically cover 80% of the property price (20% down payment).
const MAX_EMI_TO_INCOME = 0.4
const LOAN_TO_VALUE = 0.8

export default function BudgetFinder() {
  const { activeProperties } = useData()
  const [income, setIncome] = useState(150000)
  const [rate, setRate] = useState(8.5)
  const [years, setYears] = useState(20)

  const result = useMemo(() => {
    const maxEmi = income * MAX_EMI_TO_INCOME
    const monthlyRate = rate / 12 / 100
    const months = years * 12
    const r = Math.pow(1 + monthlyRate, months)
    const maxLoan = (maxEmi * (r - 1)) / (monthlyRate * r)
    const maxBudget = maxLoan / LOAN_TO_VALUE
    return { maxEmi, maxLoan, maxBudget }
  }, [income, rate, years])

  const matches = activeProperties
    .filter((p) => p.purpose === 'Buy' && p.price <= result.maxBudget)
    .sort((a, b) => b.price - a.price)
    .slice(0, 4)

  return (
    <section className="mb-16" aria-labelledby="budget-finder-heading">
      <GlassCard hover={false} strong className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-9 h-9 rounded-full glass-weak flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-[var(--color-accent)]" />
          </span>
          <h2 id="budget-finder-heading" className="text-xl md:text-2xl font-bold">What Can You Afford?</h2>
        </div>
        <p className="text-secondary text-sm mb-6">
          Tell us your monthly income and we'll estimate your home loan eligibility and budget instantly.
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="flex flex-col gap-5">
            <SliderField
              label="Monthly Income"
              value={income}
              onChange={setIncome}
              min={25000}
              max={1000000}
              step={5000}
              format={(v) => `₹${formatINR(v)}`}
            />
            <SliderField
              label="Interest Rate"
              value={rate}
              onChange={setRate}
              min={6}
              max={14}
              step={0.1}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <SliderField
              label="Loan Tenure"
              value={years}
              onChange={setYears}
              min={5}
              max={30}
              step={1}
              format={(v) => `${v} yrs`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatBlock label="Max EMI" value={`₹${formatINR(result.maxEmi)}`} />
            <StatBlock label="Loan Eligibility" value={formatCompact(result.maxLoan)} />
            <StatBlock label="Property Budget" value={formatCompact(result.maxBudget)} highlight />
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Properties in your budget</h3>
              <GlassButton
                variant="glass"
                size="sm"
                as={Link}
                to={`/buy?maxPrice=${Math.round(result.maxBudget)}`}
              >
                View all in this budget
              </GlassButton>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {matches.map((p) => (
                <PropertyCard key={p.id} property={p} headingAs="p" />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-secondary text-sm mt-8 text-center">
            No listings match this budget yet — try a higher income or longer tenure.
          </p>
        )}
      </GlassCard>
    </section>
  )
}

function StatBlock({ label, value, highlight }) {
  return (
    <div
      className={`glass-weak rounded-[16px] p-4 text-center flex flex-col justify-center gap-1 ${
        highlight ? 'ring-1 ring-[var(--color-accent)]' : ''
      }`}
    >
      <p className="text-tertiary text-xs">{label}</p>
      <p className={`font-bold ${highlight ? 'text-[var(--color-accent)] text-lg' : 'text-sm'}`}>{value}</p>
    </div>
  )
}

function SliderField({ label, value, onChange, min, max, step, format }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-secondary">{label}</span>
        <span className="text-sm font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  )
}
