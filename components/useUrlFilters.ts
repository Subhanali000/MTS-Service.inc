"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { FilterState, SortOption } from "@/components/Productshoplayout"
import { buildProductBloom, facetToken, normalizeSearchTokens } from "@/lib/bloom"

// ─── Serialise FilterState → URLSearchParams ──────────────────────────────────

const VALID_SORT_OPTIONS: ReadonlySet<SortOption> = new Set([
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "rating",
  "popularity",
])

const VALID_TAGS: ReadonlySet<FilterState["tags"][number]> = new Set([
  "BEST_SELLER",
  "TRENDING",
  "NEW",
])

const URL_UPDATE_DEBOUNCE_MS = 180

function parseNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function singularizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`
  if (token.endsWith("sses") || token.endsWith("shes") || token.endsWith("ches") || token.endsWith("xes") || token.endsWith("zes")) {
    return token.slice(0, -2)
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 1) return token.slice(0, -1)
  return token
}

function normalizeCategoryKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeToken)
    .join(" ")
}

function sanitizeFilters(filters: FilterState, maxPrice: number): FilterState {
  const safeMaxPrice = Math.max(1, maxPrice)
  const min = clamp(Number.isFinite(filters.priceMin) ? filters.priceMin : 0, 0, safeMaxPrice)
  const max = clamp(Number.isFinite(filters.priceMax) ? filters.priceMax : safeMaxPrice, min, safeMaxPrice)

  return {
    ...filters,
    categories: Array.from(new Set(filters.categories.map(v => v.trim()).filter(Boolean))),
    tags: Array.from(new Set(filters.tags.filter(tag => VALID_TAGS.has(tag)))) as FilterState["tags"],
    priceMin: min,
    priceMax: max,
    rating: clamp(Number.isFinite(filters.rating) ? filters.rating : 0, 0, 5),
    sort: VALID_SORT_OPTIONS.has(filters.sort) ? filters.sort : "relevance",
  }
}

function filtersToParams(f: FilterState, maxPrice: number): URLSearchParams {
  const p = new URLSearchParams()
  const normalized = sanitizeFilters(f, maxPrice)

  if (normalized.search)               p.set("q", normalized.search)
  if (normalized.categories.length)    p.set("category", normalized.categories.join(","))
  if (normalized.tags.length)          p.set("tags", normalized.tags.join(","))
  if (normalized.priceMin > 0)         p.set("priceMin", String(normalized.priceMin))
  if (normalized.priceMax < maxPrice)  p.set("priceMax", String(normalized.priceMax))
  if (normalized.rating > 0)           p.set("rating", String(normalized.rating))
  if (normalized.inStock)              p.set("inStock", "1")
  if (normalized.hasDiscount)          p.set("discount", "1")
  if (normalized.sort !== "relevance") p.set("sort", normalized.sort)

  return p
}

// ─── Deserialise URLSearchParams → FilterState ────────────────────────────────

function paramsToFilters(p: URLSearchParams, maxPrice: number): FilterState {
  const safeMaxPrice = Math.max(1, maxPrice)
  const rawCategories = p
    .get("category")
    ?.split(",")
    .map(value => value.trim())
    .filter(Boolean) ?? []
  const rawTags = p
    .get("tags")
    ?.split(",")
    .map(value => value.trim())
    .filter((value): value is FilterState["tags"][number] => VALID_TAGS.has(value as FilterState["tags"][number])) ?? []
  const rawSort = (p.get("sort") ?? "relevance") as SortOption
  const parsedMin = clamp(parseNumber(p.get("priceMin"), 0), 0, safeMaxPrice)
  const parsedMax = clamp(parseNumber(p.get("priceMax"), safeMaxPrice), parsedMin, safeMaxPrice)

  return {
    search: p.get("q") ?? "",
    categories: Array.from(new Set(rawCategories)),
    tags: Array.from(new Set(rawTags)),
    priceMin: parsedMin,
    priceMax: parsedMax,
    rating: clamp(parseNumber(p.get("rating"), 0), 0, 5),
    inStock: p.get("inStock") === "1",
    hasDiscount: p.get("discount") === "1",
    sort: VALID_SORT_OPTIONS.has(rawSort) ? rawSort : "relevance",
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUrlFilters<T extends {
  _id: string
  model?:string
  title: string
  price: number
  finalPrice?: number
  category?: string
  tag?: "BEST_SELLER" | "TRENDING" | "NEW"
  rating?: number | null
  stock?: number
  discountType?: string | null
  createdAt?: string
}>(products: T[]) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive max price from products
  const maxPrice = useMemo(
    () => Math.ceil(Math.max(...products.map(p => p.price), 0) / 500) * 500 || 10000,
    [products]
  )

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort(),
    [products]
  )

  const bloomIndex = useMemo(
    () => products.map(product => ({ product, bloom: buildProductBloom(product) })),
    [products]
  )

  // Read filters from URL
  const filters: FilterState = useMemo(
    () => paramsToFilters(searchParams, maxPrice),
    [searchParams, maxPrice]
  )

  // Write filters back to URL with debounce to avoid churn during rapid slider updates.
  const flushReplace = useCallback((qs: string) => {
    if (qs === searchParams.toString()) return
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [router, pathname, searchParams])

  const setFilters = useCallback(
    (next: FilterState) => {
      const params = filtersToParams(next, maxPrice)
      const qs = params.toString()

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        flushReplace(qs)
        debounceTimerRef.current = null
      }, URL_UPDATE_DEBOUNCE_MS)
    },
    [flushReplace, maxPrice]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Filter + sort logic (identical to useProductFilters)
  const filteredProducts = useMemo(() => {
    const searchTokens = normalizeSearchTokens(filters.search)

    let result = bloomIndex
      .filter(({ bloom }) => {
        if (searchTokens.length && !searchTokens.every(token => bloom.has(token))) {
          return false
        }

        if (filters.tags.length && !filters.tags.every(tag => bloom.has(facetToken("tag", tag)))) {
          return false
        }

        if (filters.inStock && !bloom.has("stock:in")) {
          return false
        }

        if (filters.hasDiscount && !bloom.has("discount:on")) {
          return false
        }

        return true
      })
      .map(({ product }) => product)

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => {
        const raw = p as any
        const text = [
          raw.title ?? "",
          raw.category ?? "",
          raw.description ?? "",
          raw.model ?? "",
        ]
          .join(" ")
          .toLowerCase()

        return text.includes(q)
      })
    }
    if (filters.categories.length) {
      const selectedCategoryKeys = new Set(filters.categories.map(normalizeCategoryKey))
      result = result.filter(p => {
        if (!p.category) return false
        return selectedCategoryKeys.has(normalizeCategoryKey(p.category))
      })
    }
    if (filters.tags.length)
      result = result.filter(p => p.tag && filters.tags.includes(p.tag as any))

    result = result.filter(p => {
      const fp = p.finalPrice ?? p.price
      return fp >= filters.priceMin && fp <= filters.priceMax
    })

    if (filters.rating > 0)
      result = result.filter(p => (p.rating ?? 0) >= filters.rating)
    if (filters.inStock)
      result = result.filter(p => (p.stock ?? 1) > 0)
    if (filters.hasDiscount)
      result = result.filter(p => (p.finalPrice ?? p.price) < p.price)

    switch (filters.sort) {
      case "price_asc":
        result.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price)); break
      case "price_desc":
        result.sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price)); break
      case "rating":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      case "newest":
        result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()); break
      case "popularity": {
        const w = (p: T) => p.tag === "BEST_SELLER" ? 3 : p.tag === "TRENDING" ? 2 : p.tag === "NEW" ? 1 : 0
        result.sort((a, b) => w(b) - w(a)); break
      }
    }

    return result
  }, [bloomIndex, filters])

  return { filters, setFilters, filteredProducts, categories, maxPrice }
}