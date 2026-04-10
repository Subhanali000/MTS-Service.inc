"use client"
import { useShop } from "@/app/context/ShopContext"
import Link from "next/link"
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react"
import { getCatalogDiscountPercent, getCatalogEffectivePrice, getCatalogOriginalEffectivePrice } from "@/lib/pricing"

export default function ProductGrid({ products }: { products: any[] }) {
  const { 
    cart, 
    
    wishlist,
    toggleWishlist,
    fetchWishlist,
    displayQuantity, 
    increaseQuantity, 
    decreaseQuantity, 
    toggleCart, 
    
  } = useShop()

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
      {products.map((product) => {
        const productId = product.id;
        const effectivePrice = getCatalogEffectivePrice(product)
        const effectiveOriginalPrice = getCatalogOriginalEffectivePrice(product)
        const discountPct = getCatalogDiscountPercent(product)
       
        const isInCart = cart.some((item: any) => item.product.id === productId);
        const currentQty = displayQuantity(productId);

        return (
          <div key={productId} className="group flex flex-col">
            
            {/* --- IMAGE & ACTION AREA --- */}
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
              
              {/* Badges */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                {discountPct > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-tighter">
                    {`${discountPct}% OFF`}
                  </span>
                )}
                {product.isFeatured && (
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase">
                    Premium
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(productId)}
                className={`absolute top-3 right-3 z-10 p-2 rounded-full border-2 transition-all shadow-sm bg-white/80 hover:bg-red-50 ${
                  (typeof wishlist !== 'undefined' && wishlist.includes && wishlist.includes(productId))
                    ? 'border-red-200'
                    : 'border-gray-200'
                }`}
                aria-label="Add to wishlist"
              >
                <Heart size={18} className={(typeof wishlist !== 'undefined' && wishlist.includes && wishlist.includes(productId)) ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
              </button>
             

              {/* Product Image */}
              <img
                src={product.images?.[0] || "/placeholder.png"}
                alt={product.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  product.stock === 0 ? "opacity-50 grayscale" : "group-hover:scale-110"
                }`}
              />

              {/* --- OVERLAY: ADD TO CART CONTROLS --- */}
              {product.stock === 0 ? (
                <div className="absolute inset-x-0 bottom-0 py-3 bg-slate-800/90 text-white text-center text-[10px] font-bold tracking-widest uppercase">
                  Out of Stock
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/95 backdrop-blur-md border-t border-gray-100">
                  
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => decreaseQuantity(product)}
                        className="p-1 hover:text-orange-600 transition"
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                      <span className="text-sm font-black text-slate-900 w-4 text-center">{currentQty}</span>
                      <button 
                       onClick={() => increaseQuantity(product)}
                        className="p-1 hover:text-orange-600 transition"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {/* Add/Remove Action */}
                  <button
                    onClick={() => {
                      if (isInCart) {
                        toggleCart(product, -999); // Logic to remove
                      } else {
                        toggleCart(product, currentQty);
                      }
                    }}
                    className={`w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-black tracking-widest uppercase transition-all rounded-lg active:scale-95 ${
                      isInCart
                        ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                        : "bg-slate-900 text-white hover:bg-orange-600 shadow-md"
                    }`}
                  >
                    <ShoppingCart size={14} />
                    {isInCart ? "Remove" : "Add to Cart"}
                  </button>
                </div>
              )}
            </div>

            {/* --- PRODUCT INFO --- */}
            <div className="mt-5 space-y-1 text-center md:text-left">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">
                  {product.category || "Laptop"}
                </p>
                {product.stock <= 3 && product.stock > 0 && (
                  <span className="text-[10px] font-bold text-red-500 italic">Limited Stock</span>
                )}
              </div>
              
              <Link href={`/product/${productId}`}>
                <h3 className="text-sm font-bold text-slate-800 line-clamp-1 hover:text-orange-600 transition cursor-pointer">
                  {product.title}
                </h3>
              </Link>
              
              <div className="flex items-baseline gap-2 pt-1 justify-center md:justify-start">
                <span className="text-lg font-black text-slate-900">
                  ₹{Math.round(effectivePrice).toLocaleString("en-IN")}
                </span>
                {effectiveOriginalPrice && (
                  <span className="text-xs line-through text-slate-400 font-medium italic">
                    ₹{Math.round(effectiveOriginalPrice).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  )
}