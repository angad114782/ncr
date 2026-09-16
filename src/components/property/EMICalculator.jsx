import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import GlassCard from '../glass/GlassCard'

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))
}

export default function EMICalculator({ propertyPrice }) {
  const [loanAmount, setLoanAmount] = useState(Math.round(propertyPrice * 0.8))
  const [rate, setRate] = useState(8.5)
  const [years, setYears] = useState(20)

  const emi = useMemo(() => {
    const monthlyRate = rate / 12 / 100
    const months = years * 12
    if (monthlyRate === 0) return loanAmount / months
    const r = Math.pow(1 + monthlyRate, months)
    return (loanAmount * monthlyRate * r) / (r - 1)
  }, [loanAmount, rate, years])

  const totalPayment = emi * years * 12
  const totalInterest = totalPayment - loanAmount

  return (
    <GlassCard hover={false} className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-[var(--color-accent)]" /> EMI Calculator
      </h3>

      <div className="flex flex-col gap-4">
        <SliderField
          label="Loan Amount"
          value={loanAmount}
          onChange={setLoanAmount}
          min={100000}
          max={propertyPrice}
          step={50000}
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
          min={1}
          max={30}
          step={1}
          format={(v) => `${v} yrs`}
        />
      </div>

      <div className="glass-weak rounded-[16px] p-4 mt-4 text-center">
        <p className="text-tertiary text-xs uppercase font-semibold mb-1">Monthly EMI</p>
        <p className="text-2xl font-bold text-[var(--color-accent)]">₹{formatINR(emi)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div className="glass-weak rounded-[14px] p-3 text-center">
          <p className="text-tertiary text-xs">Total Interest</p>
          <p className="font-semibold">₹{formatINR(totalInterest)}</p>
        </div>
        <div className="glass-weak rounded-[14px] p-3 text-center">
          <p className="text-tertiary text-xs">Total Payment</p>
          <p className="font-semibold">₹{formatINR(totalPayment)}</p>
        </div>
      </div>
    </GlassCard>
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
