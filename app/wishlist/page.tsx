"use client"

import { useShop } from "@/app/context/ShopContext"
import ProductCard from "@/components/Productcard"
import Link from "next/link"
import { Heart, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function WishlistPage() {
  const { wishlist } = useShop()
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (wishlist.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    fetch("/api/products")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        const all = Array.isArray(data) ? data : data.products ?? []
        setProducts(
          all.filter((p: any) => {
            const id = String(p.id ?? p._id ?? "")
            return id && wishlist.includes(id)
          })
        )
      })
      .catch((err) => {
        console.error("Wishlist products load failed:", err)
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [wishlist])

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Heart className="text-pink-500 fill-pink-500" size={28} />
              My Wishlist
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              {wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2  px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-pink-200 hover:text-pink-600"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            {products.length > 0 && (
              <Link
                href="/products"
                className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-800 transition-colors"
              >
                Continue Shopping <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>

        {/* Empty state */}
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-24 h-24 rounded-full bg-pink-50 flex items-center justify-center">
              <Heart size={40} className="text-pink-300" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-700">Your wishlist is empty</p>
              <p className="text-gray-400 mt-1 text-sm">Save items you love by clicking the heart icon</p>
            </div>
            <Link
              href="/products"
              className="mt-2 flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-pink-700 transition-colors"
            >
              <ShoppingBag size={16} /> Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={String(p.id ?? p._id)} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}