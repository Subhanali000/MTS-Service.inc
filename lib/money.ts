export function normalizeAmount(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, numeric)
}

export function formatINR(value: unknown): string {
  return `₹${Math.round(normalizeAmount(value)).toLocaleString("en-IN")}`
}

export function formatINRWithPrefix(value: unknown, prefix = "₹"): string {
  return `${prefix}${Math.round(normalizeAmount(value)).toLocaleString("en-IN")}`
}