"use client"

import Image from "next/image"
import { ShoppingCart, ArrowRight, Star, Crown, Flame, Sparkles } from "lucide-react"
import { useShop, Product as ShopProduct } from "@/app/context/ShopContext"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getCatalogDiscountAmount, getCatalogDiscountPercent, getCatalogEffectivePrice, getCatalogOriginalEffectivePrice } from "@/lib/pricing"

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = ShopProduct & {
  id?: string
  model?:string
  discountType?: "PERCENTAGE" | "FIXED" | null
  discountPercent?: number
  finalPrice?: number
  // ✅ rating comes from Reviews aggregation in /api/products
  // null  = product exists but has 0 reviews
  // number = real avg rating from reviews
  rating?: number | null
  reviews?: number       // total review count from Reviews collection
  tag?: "BEST_SELLER" | "TRENDING" | "NEW"
}
export type CartItem = {
  product: Product
  quantity: number
}
// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_IMG = "/images/No_Image_Available.jpg"

const validImg = (src?: string | null): string =>
  src && src.trim() !== "" ? src : FALLBACK_IMG

// ─── Tag config ───────────────────────────────────────────────────────────────

const tagConfig: Record<string, { icon: React.ReactNode; style: string; label: string }> = {
  BEST_SELLER: { icon: <Crown size={10} />,    style: "bg-amber-50 text-amber-700 border border-amber-200",     label: "Best Seller" },
  TRENDING:    { icon: <Flame size={10} />,     style: "bg-rose-50 text-rose-600 border border-rose-200",        label: "Trending"    },
  NEW:         { icon: <Sparkles size={10} />,  style: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "New"       },
}

// ─── StarRating ───────────────────────────────────────────────────────────────
// Uses rating/review values already aggregated by /api/products.
function StarRating({ initialRating, initialReviews }: {
  initialRating?: number | null
  initialReviews?: number
}) {
  const rating = initialRating ?? null
  const count = initialReviews ?? 0

  if (rating === null || count === 0) {
    return <p className="text-[11px] text-gray-400">No reviews yet</p>
  }

  const filled = Math.round(rating)

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={11}
            className={s <= filled ? "fill-amber-400 text-amber-400" : "fill-gray-100 text-gray-300"}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-gray-700">{rating.toFixed(1)}</span>
    
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter()
  const { toggleCart,  cart } = useShop()

  const [mounted,     setMounted]     = useState(false)
  const [animateCart, setAnimateCart] = useState(false)
  const [imgIndex,    setImgIndex]    = useState(0)
  const [isHovered,   setIsHovered]   = useState(false)
  const [addedFlash,  setAddedFlash]  = useState(false)

  useEffect(() => setMounted(true), [])

  // Filter out empty/blank strings — never pass "" to <Image src>
  const images: string[] = (product.images ?? []).filter((img) => img && img.trim() !== "")
  const safeImages = images.length > 0 ? images : [FALLBACK_IMG]
  const currentImage = validImg(safeImages[imgIndex] ?? safeImages[0])
const isOutOfStock = (product.stock ?? 99) === 0;
  // Cycle through images on hover
  useEffect(() => {
    if (!isHovered || safeImages.length < 2) return
    const id = setInterval(() => setImgIndex((i) => (i + 1) % safeImages.length), 1200)
    return () => { clearInterval(id); setImgIndex(0) }
  }, [isHovered, safeImages.length])

 const isInCart =
  mounted &&
  cart.some((item: CartItem) => item.product.id === product.id)
  

  const effectiveDisplayPrice = getCatalogEffectivePrice(product)
  const effectiveOriginalPrice = getCatalogOriginalEffectivePrice(product)
  const hasDiscount = effectiveOriginalPrice !== null
  const discountPct = getCatalogDiscountPercent(product)
  const discountAmount = getCatalogDiscountAmount(product)

  const discountLabel = hasDiscount ? `${discountPct}% OFF` : ""

  // Fly-to-cart animation
  const flyToCart = useCallback(() => {
    const img      = document.getElementById(`product-image-${product.id}`)
    const cartIcon = document.getElementById("navbar-cart")
    if (!img || !cartIcon) return

    const imgRect  = img.getBoundingClientRect()
    const cartRect = cartIcon.getBoundingClientRect()
    const clone    = img.cloneNode(true) as HTMLElement

    Object.assign(clone.style, {
      position: "fixed", left: imgRect.left + "px", top: imgRect.top + "px",
      width: imgRect.width + "px", height: imgRect.height + "px",
      transition: "all 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      zIndex: "9999", borderRadius: "12px", pointerEvents: "none",
    })
    document.body.appendChild(clone)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        Object.assign(clone.style, {
          left: cartRect.left + "px", top: cartRect.top + "px",
          width: "24px", height: "24px", opacity: "0",
        })
      })
    })
    setTimeout(() => clone.remove(), 700)
  }, [product.id])

  const handleCartClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isInCart) { router.push("/cart"); return }
    toggleCart(product, 1)
    flyToCart()
    setAnimateCart(true)
    setAddedFlash(true)
    setTimeout(() => setAnimateCart(false), 500)
    setTimeout(() => setAddedFlash(false), 1200)
  }

 

  return (
    <div
      onClick={() => router.push(`/products/${product.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl overflow-hidden  transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl shadow-sm border border-gray-100"
    >
      {/* ── IMAGE AREA ──────────────────────────────────────────────────── */}
      <div className="relative cursor-pointer h-60 w-full overflow-hidden bg-gray-50">

        <div id={`product-image-${product.id}`} className="relative h-full w-full">
          <Image
            src={currentImage}
            alt={product.title}
            fill
            className={`object-cover transition-all duration-700 group-hover:scale-105
          ${
      (product.stock ?? 99) === 0 ? " grayscale opacity-70" : ""
    }`}
  />
        </div>

        <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {discountLabel && (
          <div className="absolute top-3 left-3 z-10 bg-linear-to-r from-pink-600 to-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md tracking-wide">
            {discountLabel}
          </div>
        )}

        {product.tag && tagConfig[product.tag] && (
            <div className={`absolute top-3 ${discountLabel ? "right-2" : "right-3"} z-10 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${tagConfig[product.tag].style}`}>
            {tagConfig[product.tag].icon}
            {tagConfig[product.tag].label}
          </div>
        )}

        
        

        {safeImages.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1 z-10">
            {safeImages.map((_, i) => (
              <span key={i} className={`block rounded-full transition-all duration-300 ${
                i === imgIndex ? "w-3.5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`} />
            ))}
          </div>
        )}
      </div>

      {/* ── DETAILS AREA ────────────────────────────────────────────────── */}
      <div className="p-4">

        <div className="flex items-center justify-between group">
  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hove: transition-colors duration-200">
    {product.title}
  </h3>

  {/* Low stock badge */}
  {(product.stock ?? 99) > 0 && (product.stock ?? 99) <= 5 && (
    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-[11px] font-semibold text-amber-700 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      Only {product.stock} left
    </div>
  )}
</div>

        {/* ✅ rating & reviews come from /api/products aggregation (Reviews collection) */}
        <div className="mb-2.5">
          <StarRating initialRating={product.rating} initialReviews={product.reviews} />
        </div>

        <div className="flex items-center justify-between mb-3">
  <div className="flex items-baseline gap-1.5" dir="ltr">
    {hasDiscount ? (
      <>
        {/* Discounted Price */}
        <span className="text-lg font-black text-black tracking-tight">
          ₹{Math.round(effectiveDisplayPrice).toLocaleString("en-IN")}
        </span>
        {/* Original Strikethrough Price */}
        <span className="text-xs line-through text-gray-400">
          ₹{Math.round(effectiveOriginalPrice ?? 0).toLocaleString("en-IN")}
        </span>
      </>
    ) : (
      /* Standard Price (When no discount exists) */
      <span className="text-lg font-black text-gray-900 tracking-tight">
        ₹{Math.round(effectiveDisplayPrice).toLocaleString("en-IN")}
      </span>
    )}
  </div>

  {hasDiscount && (
    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      Save ₹{Math.round(discountAmount).toLocaleString("en-IN")}
    </span>
  )}
</div>
        
         
        <button
          onClick={handleCartClick}
          disabled={isOutOfStock}
          className={`relative w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 overflow-hidden ${
            addedFlash
              ? "bg-emerald-500 text-white"
              : isInCart
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-900 text-white cursor-pointer hover:bg-gray-600"
          }`}
        >
          {addedFlash && <span className="absolute inset-0 bg-white/20  animate-ping rounded-xl" />}
          <span className={`transition-transform  duration-300 ${animateCart ? "scale-125" : ""}`}>
            {isInCart ? <ArrowRight size={16} /> : <ShoppingCart size={16} />}
          </span>
          {addedFlash ? "Added!" : isInCart ? "Go to Cart" : "Add to Cart"}
        </button>
      </div>

      

     {(product.stock ?? 99) === 0 && (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
        Out of Stock
      </span>
    </div>
  )}
    </div>
  )
}