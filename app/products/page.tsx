import { Suspense } from "react"
import { getProducts } from "@/lib/apiserver"
import { ProductsClient } from "@/components/ProductsClient"

export const dynamic = "force-dynamic"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: {
    q?: string
    category?: string
    tags?: string
    priceMin?: string
    priceMax?: string
    rating?: string
    inStock?: string
    discount?: string
    sort?: string
    limit?: string
  }
}) {
  const query = searchParams?.q || ""

  const filters = {
    category: searchParams?.category,
    tags: searchParams?.tags,
    priceMin: searchParams?.priceMin,
    priceMax: searchParams?.priceMax,
    rating: searchParams?.rating,
    inStock: searchParams?.inStock,
    discount: searchParams?.discount,
    sort: searchParams?.sort,
    limit: searchParams?.limit,
  }

  const products = await getProducts(query, { filters })

  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <ProductsClient
        rawProducts={products}
        searchQuery={query}
      />
    </Suspense>
  )
}