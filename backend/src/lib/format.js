// Same rule as the website's formatPriceShort (src/utils/format.js): ₹2.15 Cr / ₹45.5 L / ₹85,000
export function formatPriceShort(n) {
  const v = Number(n) || 0
  if (v >= 10000000) return `₹${parseFloat((v / 10000000).toFixed(2))} Cr`
  if (v >= 100000) return `₹${parseFloat((v / 100000).toFixed(1))} L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}
