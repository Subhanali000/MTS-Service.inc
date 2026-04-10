type BloomSource = {
  title?: string | null
  category?: string | null
  description?: string | null
  model?: string | null
  tag?: string | null
  stock?: number | null
  price?: number | null
  finalPrice?: number | null
}

export function normalizeSearchTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function normalizeFacetValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "_")
}

export function facetToken(kind: string, value: string): string {
  return `${kind}:${normalizeFacetValue(value)}`
}

function hash32(value: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

export class BloomFilter {
  private readonly bits: Uint8Array

  constructor(
    private readonly size: number = 2048,
    private readonly hashCount: number = 5,
  ) {
    this.bits = new Uint8Array(Math.ceil(size / 8))
  }

  add(value: string) {
    if (!value) return
    for (const index of this.indices(value)) {
      this.bits[index >> 3] |= 1 << (index & 7)
    }
  }

  has(value: string) {
    if (!value) return true
    return this.indices(value).every(index => (this.bits[index >> 3] & (1 << (index & 7))) !== 0)
  }

  private indices(value: string): number[] {
    const normalized = value.toLowerCase()
    const primary = hash32(normalized)
    const secondary = (hash32(`${normalized}:${normalized.length}`) | 1) >>> 0

    return Array.from({ length: this.hashCount }, (_, step) => {
      const mixed = (primary + step * secondary + step * step) >>> 0
      return mixed % this.size
    })
  }
}

export function buildProductBloom(product: BloomSource): BloomFilter {
  const bloom = new BloomFilter()

  const fragments = [
    product.title ?? "",
    product.category ?? "",
    product.description ?? "",
    product.model ?? "",
    product.tag ?? "",
  ]

  for (const fragment of fragments) {
    for (const token of normalizeSearchTokens(fragment)) {
      bloom.add(token)
    }
  }

  if (product.category) {
    bloom.add(facetToken("category", product.category))
  }

  if (product.tag) {
    bloom.add(facetToken("tag", product.tag))
  }

  if ((product.stock ?? 0) > 0) {
    bloom.add("stock:in")
  }

  if ((product.finalPrice ?? product.price ?? 0) < (product.price ?? 0)) {
    bloom.add("discount:on")
  }

  return bloom
}