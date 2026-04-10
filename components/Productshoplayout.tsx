"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  SlidersHorizontal, X, ChevronDown, ChevronUp,
  LayoutGrid, LayoutList, ArrowUpDown, Star, Sparkles,
  Crown, Flame, Tag, Check, RotateCcw, Filter
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "rating"
  | "popularity"

export interface FilterState {
  search:      string
  categories:  string[]
  tags:        Array<"BEST_SELLER" | "TRENDING" | "NEW">
  priceMin:    number
  priceMax:    number
  rating:      number
  inStock:     boolean
  hasDiscount: boolean
  sort:        SortOption
}

interface FilterPanelProps {
  filters:     FilterState
  onChange:    (f: FilterState) => void
  categories:  string[]
  maxPrice:    number
  resultCount: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance",  label: "Relevance"         },
  { value: "newest",     label: "Newest First"      },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Top Rated"         },
  { value: "popularity", label: "Most Popular"      },
]

const DEFAULT_FILTERS: FilterState = {
  search:      "",
  categories:  [],
  tags:        [],
  priceMin:    0,
  priceMax:    100000,
  rating:      0,
  inStock:     false,
  hasDiscount: false,
  sort:        "relevance",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activeFilterCount(f: FilterState, maxPrice: number): number {
  let n = 0
  if (f.categories.length)               n++
  if (f.tags.length)                     n++
  if (f.priceMin > 0 || f.priceMax < maxPrice) n++
  if (f.rating > 0)                      n++
  if (f.inStock)                         n++
  if (f.hasDiscount)                     n++
  return n
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Accordion({
  title, children, defaultOpen = false,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:text-rose-600"
      >
        {title}
        {open
          ? <ChevronUp size={15} className="text-slate-400" />
          : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

function PriceRangeSlider({
  min, max, value, onChange,
}: {
  min: number; max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), value[1] - 1)
    onChange([v, value[1]])
  }
  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), value[0] + 1)
    onChange([value[0], v])
  }

  return (
    <div className="space-y-4">
      <div ref={trackRef} className="relative h-1.5 bg-gray-200 rounded-full">
        <div
          className="absolute h-full bg-linear-to-r from-pink-500 to-rose-500 rounded-full"
          style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
        />
        <input
          type="range" min={min} max={max} value={value[0]}
          onChange={handleMinInput}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: value[0] > max - 100 ? 5 : 3 }}
        />
        <input
          type="range" min={min} max={max} value={value[1]}
          onChange={handleMaxInput}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: 4 }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-pink-500 rounded-full shadow-md -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${pct(value[0])}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-pink-500 rounded-full shadow-md -translate-y-1/2 top-1/2 -translate-x-1/2 pointer-events-none"
          style={{ left: `${pct(value[1])}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
          <input
            type="number" min={min} max={value[1] - 1} value={value[0]}
            onChange={handleMinInput}
            className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-300 bg-gray-50"
          />
        </div>
        <span className="text-gray-300 text-xs">—</span>
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
          <input
            type="number" min={value[0] + 1} max={max} value={value[1]}
            onChange={handleMaxInput}
            className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-300 bg-gray-50"
          />
        </div>
      </div>
    </div>
  )
}

function StarFilterRow({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      {[4, 3, 2, 1].map(stars => (
        <button
          key={stars}
          onClick={() => onChange(value === stars ? 0 : stars)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            value === stars
              ? "bg-amber-50 border border-amber-200 text-amber-700"
              : "hover:bg-gray-50 text-gray-600"
          }`}
        >
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star
                key={s}
                size={11}
                className={s <= stars ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
              />
            ))}
          </div>
          <span className="font-medium">{stars}+ stars</span>
          {value === stars && <Check size={11} className="ml-auto text-amber-600" />}
        </button>
      ))}
    </div>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

export function FilterPanel({ filters, onChange, categories, maxPrice, resultCount }: FilterPanelProps) {
  const set = useCallback(
    <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
      onChange({ ...filters, [key]: val }),
    [filters, onChange]
  )

  const toggleCategory = (cat: string) =>
    set("categories", filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat])

  const toggleTag = (tag: FilterState["tags"][number]) =>
    set("tags", filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag])

  const resetAll = () => onChange({ ...DEFAULT_FILTERS, priceMax: maxPrice })
  const activeCount = activeFilterCount(filters, maxPrice)

  return (
    <aside className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_45px_-30px_rgba(2,6,23,0.35)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-white via-slate-50 to-white px-4 py-3.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-rose-500" />
          <span className="text-sm font-bold text-slate-900">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-rose-600"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className="border-b border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        {resultCount} product{resultCount !== 1 ? "s" : ""} found
      </div>

      <div className="px-4 pb-1">
        {categories.length > 0 && (
          <Accordion title="Category" defaultOpen>
            <div className="space-y-1">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => toggleCategory(cat)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      filters.categories.includes(cat)
                        ? "bg-pink-600 border-pink-600"
                        : "border-gray-300 group-hover:border-pink-400"
                    }`}
                  >
                    {filters.categories.includes(cat) && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span
                    onClick={() => toggleCategory(cat)}
                    className="text-sm text-gray-700 group-hover:text-gray-900 capitalize"
                  >
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </Accordion>
        )}

        <Accordion title="Price Range" defaultOpen>
          <PriceRangeSlider
            min={0}
            max={maxPrice}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([mn, mx]) => onChange({ ...filters, priceMin: mn, priceMax: mx })}
          />
        </Accordion>

        <Accordion title="Customer Rating">
          <StarFilterRow value={filters.rating} onChange={v => set("rating", v)} />
        </Accordion>

        <Accordion title="Product Tags">
          <div className="flex flex-wrap gap-1.5">
            {(["BEST_SELLER", "TRENDING", "NEW"] as const).map(tag => {
              const icons  = { BEST_SELLER: <Crown size={10}/>, TRENDING: <Flame size={10}/>, NEW: <Sparkles size={10}/> }
              const labels = { BEST_SELLER: "Best Seller", TRENDING: "Trending", NEW: "New" }
              const styles = {
                BEST_SELLER: "bg-amber-50 text-amber-700 border-amber-200",
                TRENDING:    "bg-rose-50 text-rose-600 border-rose-200",
                NEW:         "bg-emerald-50 text-emerald-700 border-emerald-200",
              }
              const active = filters.tags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    active
                      ? styles[tag] + " ring-2 ring-offset-1 ring-pink-300"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {icons[tag]}
                  {labels[tag]}
                  {active && <X size={9} className="ml-0.5" />}
                </button>
              )
            })}
          </div>
        </Accordion>

        <Accordion title="Availability & Offers">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => set("inStock", !filters.inStock)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  filters.inStock ? "bg-pink-600 border-pink-600" : "border-gray-300 group-hover:border-pink-400"
                }`}
              >
                {filters.inStock && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span onClick={() => set("inStock", !filters.inStock)} className="text-sm text-gray-700 cursor-pointer">
                In Stock Only
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => set("hasDiscount", !filters.hasDiscount)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  filters.hasDiscount ? "bg-pink-600 border-pink-600" : "border-gray-300 group-hover:border-pink-400"
                }`}
              >
                {filters.hasDiscount && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span onClick={() => set("hasDiscount", !filters.hasDiscount)} className="text-sm text-gray-700 cursor-pointer flex items-center gap-1">
                <Tag size={12} className="text-pink-500" /> On Sale
              </span>
            </label>
          </div>
        </Accordion>
      </div>
    </aside>
  )
}

// ─── Top Bar (search removed) ─────────────────────────────────────────────────

export function ShopTopBar({
  filters, onChange, resultCount, view, onViewChange,
}: {
  filters:      FilterState
  onChange:     (f: FilterState) => void
  resultCount:  number
  view:         "grid" | "list"
  onViewChange: (v: "grid" | "list") => void
}) {
  const [sortOpen, setSortOpen] = useState(false)
  const currentSort = SORT_OPTIONS.find(o => o.value === filters.sort)!

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.55)]">

      {/* Result count */}
      <span className="whitespace-nowrap text-sm text-slate-500">
        <b className="text-slate-800">{resultCount}</b> products
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortOpen(o => !o)}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-3 text-sm transition-all hover:border-rose-300"
        >
          <ArrowUpDown size={13} className="text-slate-400" />
          <span className="font-medium text-slate-700">{currentSort.label}</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-45 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange({ ...filters, sort: opt.value }); setSortOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                  filters.sort === opt.value
                    ? "bg-rose-50 font-semibold text-rose-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt.label}
                {filters.sort === opt.value && <Check size={13} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
        <button
          onClick={() => onViewChange("grid")}
          className={`p-2.5 transition-colors ${view === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`p-2.5 transition-colors ${view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <LayoutList size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Active Filter Chips ──────────────────────────────────────────────────────

export function ActiveFilterChips({
  filters, onChange, maxPrice,
}: { filters: FilterState; onChange: (f: FilterState) => void; maxPrice: number }) {
  const chips: { label: string; onRemove: () => void }[] = []

  filters.categories.forEach(cat =>
    chips.push({ label: cat, onRemove: () => onChange({ ...filters, categories: filters.categories.filter(c => c !== cat) }) })
  )
  filters.tags.forEach(tag => {
    const labels = { BEST_SELLER: "Best Seller", TRENDING: "Trending", NEW: "New" }
    chips.push({ label: labels[tag], onRemove: () => onChange({ ...filters, tags: filters.tags.filter(t => t !== tag) }) })
  })
  if (filters.priceMin > 0 || filters.priceMax < maxPrice)
    chips.push({ label: `₹${filters.priceMin}–₹${filters.priceMax}`, onRemove: () => onChange({ ...filters, priceMin: 0, priceMax: maxPrice }) })
  if (filters.rating > 0)
    chips.push({ label: `${filters.rating}+ stars`, onRemove: () => onChange({ ...filters, rating: 0 }) })
  if (filters.inStock)
    chips.push({ label: "In Stock", onRemove: () => onChange({ ...filters, inStock: false }) })
  if (filters.hasDiscount)
    chips.push({ label: "On Sale", onRemove: () => onChange({ ...filters, hasDiscount: false }) })

  if (chips.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
        >
          {chip.label}
          <button onClick={chip.onRemove} className="transition-colors hover:text-rose-900">
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ ...DEFAULT_FILTERS, priceMax: maxPrice })}
        className="px-1 text-xs text-slate-500 underline underline-offset-2 transition-colors hover:text-rose-600"
      >
        Clear all
      </button>
    </div>
  )
}

// ─── Hook: useProductFilters ──────────────────────────────────────────────────

export function useProductFilters<T extends {
  _id: string
  title: string
  price: number
  finalPrice?: number
  category?: string
  tag?: "BEST_SELLER" | "TRENDING" | "NEW"
  rating?: number | null
  stock?: number
  discountType?: string | null
  discountPercent?: number
  createdAt?: string
}>(products: T[]) {
  const maxPrice = useMemo(
    () => Math.ceil(Math.max(...products.map(p => p.price), 0) / 500) * 500 || 10000,
    [products]
  )

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort(),
    [products]
  )

  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    priceMax: maxPrice,
  })

  useEffect(() => {
    setFilters(f => ({ ...f, priceMax: Math.max(f.priceMax, maxPrice) }))
  }, [maxPrice])

  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Search (still supported via searchQuery prop from ProductsClient)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }

    if (filters.categories.length)
      result = result.filter(p => p.category && filters.categories.includes(p.category))

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
      case "price_asc":   result.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price)); break
      case "price_desc":  result.sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price)); break
      case "rating":      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      case "newest":      result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()); break
      case "popularity": {
        const weight = (p: T) => p.tag === "BEST_SELLER" ? 3 : p.tag === "TRENDING" ? 2 : p.tag === "NEW" ? 1 : 0
        result.sort((a, b) => weight(b) - weight(a)); break
      }
      default: break
    }

    return result
  }, [products, filters])

  return { filters, setFilters, filteredProducts, categories, maxPrice }
}

// ─── Mobile Filter Drawer ─────────────────────────────────────────────────────

export function MobileFilterDrawer({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-[85vw] max-w-xs h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-pink-500" />
            <span className="font-bold text-sm text-gray-900">Filters</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-600" />
          </button>
        </div>
        <div className="p-2">{children}</div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-pink-600 text-white rounded-xl font-semibold text-sm hover:bg-pink-700 transition-colors"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  )
}