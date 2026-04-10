"use client"

import { Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ProductCard from "@/components/Productcard"

function FiltersContent({
  products,
  searchParams,
}: {
  products: any[]
  searchParams: any
}) {
  const router = useRouter()
  const params = useSearchParams()

  // 🔹 Read values from URL
  const search = params.get("search") || ""
  const tag = params.get("tag") || "ALL"
  const sort = params.get("sort") || ""
  const page = parseInt(params.get("page") || "1")

  const minPrice = Number(params.get("minPrice") || 0)
  const maxPrice = Number(params.get("maxPrice") || 100000)

  const ITEMS_PER_PAGE = 6

  // 🔹 Filter + Sort
  const processed = useMemo(() => {
    let filtered = products.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
      const matchTag = tag === "ALL" || p.tag === tag

      const price = p.finalPrice ?? p.price
      const matchPrice = price >= minPrice && price <= maxPrice

      return matchSearch && matchTag && matchPrice
    })

    // Sorting
    if (sort === "price_asc") {
      filtered.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price))
    }

    if (sort === "price_desc") {
      filtered.sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price))
    }

    if (sort === "rating") {
      filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    }

    return filtered
  }, [products, search, tag, sort, minPrice, maxPrice])

  // Pagination
  const totalPages = Math.ceil(processed.length / ITEMS_PER_PAGE)
  const paginated = processed.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  // 🔹 Update URL helper
  const updateParams = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(params.entries()))

    if (!value || value === "ALL") {
      current.delete(key)
    } else {
      current.set(key, value)
    }

    current.set("page", "1") // reset page on filter change

    router.push(`/products?${current.toString()}`)
  }

  return (
    <div className="flex gap-6 p-6">

      {/* ───────── Sidebar Filters ───────── */}
      <div className="w-64 space-y-5 bg-white p-4 rounded-xl shadow-sm h-fit sticky top-20">

        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          defaultValue={search}
          onChange={(e) => updateParams("search", e.target.value)}
          className="w-full border px-3 py-2 rounded-lg text-sm"
        />

        {/* Tag Filter */}
        <select
          value={tag}
          onChange={(e) => updateParams("tag", e.target.value)}
          className="w-full border px-3 py-2 rounded-lg text-sm"
        >
          <option value="ALL">All</option>
          <option value="BEST_SELLER">Best Seller</option>
          <option value="TRENDING">Trending</option>
          <option value="NEW">New</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => updateParams("sort", e.target.value)}
          className="w-full border px-3 py-2 rounded-lg text-sm"
        >
          <option value="">Sort</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rating">Rating</option>
        </select>

        {/* Price Range */}
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Min Price"
            defaultValue={minPrice}
            onBlur={(e) => updateParams("minPrice", e.target.value)}
            className="w-full border px-3 py-2 rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="Max Price"
            defaultValue={maxPrice}
            onBlur={(e) => updateParams("maxPrice", e.target.value)}
            className="w-full border px-3 py-2 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* ───────── Products Grid ───────── */}
      <div className="flex-1">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        {/* ───────── Pagination ───────── */}
        <div className="flex justify-center mt-8 gap-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1
            const isActive = p === page

            return (
              <button
                key={p}
                onClick={() => updateParams("page", String(p))}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function FiltersPage(props: {
  products: any[]
  searchParams: any
}) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading filters...</div>}>
      <FiltersContent {...props} />
    </Suspense>
  )
}