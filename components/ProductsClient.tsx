"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import ProductCard from "@/components/Productcard"
import {
  FilterPanel,
  ShopTopBar,
  ActiveFilterChips,
  MobileFilterDrawer,
} from "@/components/Productshoplayout"
import { useUrlFilters } from "@/components/useUrlFilters"
import { Filter, X } from "lucide-react"
import { Product as ShopProduct } from "@/app/context/ShopContext"

// Mirror exactly what ProductCard expects
type Product = ShopProduct & {
  id: string;
  model?:string
  discountType?: "PERCENTAGE" | "FIXED" | null
  discountPercent?: number
  finalPrice?: number
  rating?: number | null
  reviews?: number
  tag?: "BEST_SELLER" | "TRENDING" | "NEW"
}

// ─── Props ────────────────────────────────────────────────────────────────────
export function ProductsClient({
  rawProducts,
  searchQuery = "",          // ← NEW: passed from ProductsPage via ?q= param
}: {
  rawProducts: any[]
  searchQuery?: string
}) {
  const [view, setView]     = useState<"grid" | "list">("grid")
  const [drawer, setDrawer] = useState(false)

  // Normalize data — coerce null/undefined to safe defaults
  const products: (Product & { _id: string; title: string; price: number; id: string })[] = useMemo(
    () =>
      rawProducts.map((p) => ({
        ...p,
        id: p.id ?? p._id ?? "",
        _id: p._id ?? p.id ?? "",
        title: p.title ?? p.name ?? "",
        price: p.price ?? 0,
        images: p.images ?? [],
        discountPercent: p.discountPercent ?? undefined,
        finalPrice: p.finalPrice ?? undefined,
        rating: p.rating ?? null,
        reviews: p.reviews ?? 0,
        stock: p.stock ?? 0,
      })),
    [rawProducts]
  )

  const { filters, setFilters, filteredProducts, categories, maxPrice } =
    useUrlFilters(products)

  const activeSearchQuery = (filters.search || searchQuery).trim()

  return (
    <div className="flex gap-6 rounded-3xl bg-linear-to-b from-white via-slate-50/40 to-white p-3 md:p-4">

      {/* ── Desktop Sidebar ── */}
      <div className="hidden lg:block w-64 flex-none sticky top-4 self-start">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          categories={categories}
          maxPrice={maxPrice}
          resultCount={filteredProducts.length}
        />
      </div>

      {/* ── Main content ── */}
      <div className="min-w-0 flex-1">

        {/* Active search banner */}
        {activeSearchQuery && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-linear-to-r from-rose-50 to-amber-50 px-4 py-3 shadow-[0_10px_20px_-18px_rgba(244,63,94,0.6)]">
            <p className="text-sm text-slate-700">
              Showing <span className="font-bold text-rose-600">{filteredProducts.length}</span> result{filteredProducts.length !== 1 ? "s" : ""} for{" "}
              <span className="font-bold text-slate-900">&quot;{activeSearchQuery}&quot;</span>
            </p>
            {/* Clear search — goes back to /products with no query */}
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-bold text-rose-600 transition-colors hover:text-rose-800"
            >
              <X size={13} /> Clear search
            </Link>
          </div>
        )}

        {/* Search + Sort + View toggle */}
        <ShopTopBar
          filters={filters}
          onChange={setFilters}
          resultCount={filteredProducts.length}
          view={view}
          onViewChange={setView}
        />

        {/* Active filter chips */}
        <ActiveFilterChips
          filters={filters}
          onChange={setFilters}
          maxPrice={maxPrice}
        />

        {/* Grid or List */}
       {/* Grid or List */}
{filteredProducts.length > 0 ? (
  <div
    className={
      view === "grid"
        ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        : "flex flex-col gap-4"
    }
  >
    {filteredProducts.map((product) => (
      <ProductCard key={product.id || product._id} product={product} />
    ))}
  </div>
) : (
  /* --- NO PRODUCTS FOUND SECTION --- */
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white py-24 shadow-[0_20px_40px_-35px_rgba(15,23,42,0.55)]">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">🔍</span>
    
    <p className="font-medium text-slate-500">
      {searchQuery.trim()
        ? `No products found for "${searchQuery}"`
        : "No products match your filters."}
    </p>

    <div className="flex items-center gap-3">
      {/* If there is a search query, ONLY show "Clear search".
         If there is NO search query, show "Clear all filters".
      */}
      {activeSearchQuery ? (
        <Link
          href="/products"
          className="text-sm text-pink-600 underline underline-offset-2 font-semibold"
        >
          Clear search and see all products
        </Link>
      ) : (
        <button
          onClick={() =>
            setFilters({
              ...filters,
              categories: [],
              tags: [],
              priceMin: 0,
              priceMax: maxPrice,
              rating: 0,
              inStock: false,
              hasDiscount: false,
            })
          }
          className="text-sm font-semibold text-rose-600 underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile filter button ── */}
      <button
        onClick={() => setDrawer(true)}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-slate-900/30 lg:hidden"
      >
        <Filter size={15} /> Filters
      </button>

      {/* ── Mobile drawer ── */}
      <MobileFilterDrawer open={drawer} onClose={() => setDrawer(false)}>
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          categories={categories}
          maxPrice={maxPrice}
          resultCount={filteredProducts.length}
        />
      </MobileFilterDrawer>
    </div>
  )
}