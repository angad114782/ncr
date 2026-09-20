// Dependency-free formatters (shared with the build scripts).
export function formatPriceShort(n) {
  // parseFloat drops trailing zeros: 4.50 → 4.5, 4.00 → 4
  if (n >= 10000000) return `₹${parseFloat((n / 10000000).toFixed(2))} Cr`
  if (n >= 100000) return `₹${parseFloat((n / 100000).toFixed(1))} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
