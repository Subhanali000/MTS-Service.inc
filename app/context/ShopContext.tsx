"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from "react"
import { toast } from "react-hot-toast"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

// ───────────────── TYPES ─────────────────
export type Product = {
  id: string
  title: string
  price: number
  weight?: number
  stock?: number
  images: string[]
  category?: string
  description?: string
  originalPrice?: number
  discountType?: "PERCENTAGE" | "FIXED" | null
  discountPercent?: number
  discountValue?: number
  finalPrice?: number
  rating?: number | null
  reviews?: number
  tag?: "BEST_SELLER" | "TRENDING" | "NEW"
  totalSold?: number
}

export type Review = {
  id: string
  productId: string
  author: string
  rating: number
  title: string
  body: string
  helpful: number
  unhelpful: number
  myVote?: "up" | "down" | null
  isOwner?: boolean
}

// ───────────────── MAP PRODUCT ─────────────────
function mapProduct(raw: any): Product {
  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images
    : raw.image
    ? [raw.image]
    : []

  return {
    id: String(raw.id ?? ""),
    title: raw.title || raw.name || "",
    price: raw.price ?? 0,
    weight: raw.weight ?? undefined,
    stock: raw.stock,
    images: rawImages.filter((img: string) => img?.trim()),
    category: raw.category,
    description: raw.description,
    originalPrice: raw.originalPrice,
    discountType: raw.discountType ?? null,
    discountPercent: raw.discountPercent ?? 0,
    discountValue: raw.discountValue ?? 0,
    finalPrice: raw.finalPrice,
    rating: raw.rating ?? null,
    reviews: raw.reviews ?? 0,
    tag: raw.tag,
    totalSold: raw.totalSold ?? 0
  }
}

// ───────────────── FETCH UTILITY ─────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 2,
  delayMs: number = 400
): Promise<Response> {
  const opts: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {})
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts)

      if (res.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * 2 ** attempt))
        continue
      }

      return res
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * 2 ** attempt))
        continue
      }
      throw err
    }
  }

  throw new Error("Max retries exceeded")
}

// ───────────────── CONTEXT TYPE ─────────────────
type ShopActionResult = { ok: boolean; error?: string }

type ShopContextType = {
  cart: any[]
  wishlist: string[]
  reviews: Review[]
  cartUpdated: boolean
  loading: boolean
  googleLoading: boolean
  fetchCart: () => Promise<void>
   getDashboardRoute: () => string
  getTicketRoute: (orderNumber?: string) => string
  getOrderRoute: (orderId?: string) => string
  error: string | null
  goToCart: () => void
  wishlistUpdated: boolean
  wishlistLoading: boolean
  fetchWishlist:   () => Promise<void>
  toggleCart: (product: Product, qty: number) => void
  toggleWishlist: (productId: string) => void
  loadReviews: (productId: string) => Promise<void>
  submitReview: (payload: any) => Promise<any>
  voteReview: (id: string, vote: "up" | "down") => Promise<any>
  login: (email: string, password: string) => Promise<boolean>
  googleLogin: () => Promise<void>
  displayQuantity: (id: string) => number
  increaseQuantity: (product: Product) => void
  decreaseQuantity: (product: Product) => void
}

// ───────────────── CONTEXT ─────────────────
const ShopContext = createContext<ShopContextType | null>(null)

export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession()
  const router = useRouter()
const [loading, setLoading] = useState(false)
const [googleLoading, setGoogleLoading] = useState(false)

const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [cartUpdated, setCartUpdated] = useState(false)
  const [wishlistUpdated, setWishlistUpdated] = useState(false)
   const [wishlistLoading, setWishlistLoading] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const cartRef = useRef<any[]>([])
  const wishlistRef = useRef<string[]>([])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  useEffect(() => {
    wishlistRef.current = wishlist
  }, [wishlist])

 const fetchWishlist = useCallback(async () => {
    setWishlistLoading(true)
    try {
      const res = await fetchWithRetry("/api/wishlist/add", {}, 1, 150)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWishlist(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      console.error("[ShopContext] fetchWishlist:", err)
    } finally {
      setWishlistLoading(false)
    }
  }, [])

  const fetchCart = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetchWithRetry("/api/cart", {}, 1, 150);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data?.items) {
        setCart(
          data.items.map((item: any) => ({
            product: mapProduct(item.product),
            quantity: item.quantity
          }))
        );
      }
    } catch (err) {
      console.error("Load cart failed", err);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchWishlist();
    fetchCart();
  }, [session, fetchWishlist, fetchCart]);


  const toggleWishlist = useCallback(async (id: string): Promise<ShopActionResult> => {
    const previousWishlist = [...wishlistRef.current]
    const isIn = previousWishlist.includes(id);
    // Optimistic update
    setWishlist(prev => isIn ? prev.filter(i => i !== id) : [...prev, id]);
    try {
      const res = await fetchWithRetry("/api/wishlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, action: isIn ? "remove" : "add" }),
      }, 1, 150);
      if (res.status === 401) {
        // Restore previous state on auth error
        setWishlist(previousWishlist);
        return { ok: false, error: "Please log in." };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWishlist(Array.isArray(data.items) ? data.items : previousWishlist);
      setWishlistUpdated(prev => !prev)
      return { ok: true };
    } catch (err) {
      console.error("[ShopContext] toggleWishlist:", err);
      setWishlist(previousWishlist)
      return { ok: false, error: "Failed to update wishlist." };
    }
  }, []);

  // ───────────────── AUTH GUARD ─────────────────
  const requireAuth = () => {
    if (!session) {
      signIn(undefined, { callbackUrl: window.location.href })
      return false
    }
    return true
  }

  // ───────────────── CART LOAD ─────────────────
  // (Removed duplicate cart loading useEffect)
const getDashboardRoute = () => {
  const role = session?.user?.role

  if (role === "ADMIN") return "/dashboard/admin"
  if (role === "CUSTOMER") return "/dashboard/customer"

  return "/login" // fallback (important)
}

const getTicketRoute = (orderNumber?: string) => {
  if (!orderNumber) return "/support-ticket"
  return `/support-ticket?orderNumber=${encodeURIComponent(orderNumber)}`
}
const getOrderRoute = (orderId?: string) => {
  return "/orders"
}

  // ───────────────── WISHLIST LOAD ─────────────────
  // (Removed duplicate wishlist loading useEffect)

  // ───────────────── CART ─────────────────
  const toggleCart = async (product: Product, qty: number) => {
    if (!requireAuth()) return

    const previousCart = [...cartRef.current]
    const removeSignals = new Set([-999, -9999])
    const productId = String(product.id)
    const existingItem = cartRef.current.find(i => String(i.product.id) === productId)
    const exists = Boolean(existingItem)

    let nextQty = qty
    if (removeSignals.has(qty)) {
      nextQty = 0
    } else if (existingItem && (qty === 1 || qty === -1)) {
      // Some screens send +/-1 as delta for existing cart items.
      nextQty = existingItem.quantity + qty
    }

    if (typeof product.stock === "number") {
      nextQty = Math.min(nextQty, product.stock)
    }

    const isRemove = nextQty <= 0

    let apiUrl = "/api/cart"
    if (isRemove) apiUrl = "/api/cart/remove"
    else if (exists) apiUrl = "/api/cart/update"

    // optimistic UI (update ref + state together to avoid lag/race on rapid clicks)
    const optimisticCart = isRemove
      ? previousCart.filter(i => String(i.product.id) !== productId)
      : previousCart.some(i => String(i.product.id) === productId)
        ? previousCart.map(i =>
            String(i.product.id) === productId ? { ...i, quantity: Math.max(1, nextQty) } : i
          )
        : [...previousCart, { product, quantity: Math.max(1, nextQty) }]

    cartRef.current = optimisticCart
    setCart(optimisticCart)

    try {
      const res = await fetchWithRetry(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: isRemove ? 0 : nextQty,
          remove: isRemove
        })
      }, 1, 150)

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Cart sync failed")
      }

      const syncedCart = (data.items || []).map((item: any) => ({
        product: mapProduct(item.product),
        quantity: item.quantity
      }))

      cartRef.current = syncedCart
      setCart(syncedCart)

      setCartUpdated(prev => !prev)
    } catch (err: any) {
      console.error("Cart error:", err)
      cartRef.current = previousCart
      setCart(previousCart)
      toast.error(err.message || "Failed to update cart")
    }
  }


  // ───────────────── REVIEWS ─────────────────
  const loadReviews = useCallback(async (productId: string) => {
    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetchWithRetry(
        `/api/reviews?productId=${productId}`,
        { signal: controller.signal }
      )

      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      console.error("Reviews load failed")
    }
  }, [])

  const submitReview = async (payload: any) => {
    try {
      const res = await fetchWithRetry("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      setReviews(prev => [data, ...prev])
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  const voteReview = async (reviewId: string, vote: "up" | "down") => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote })
      })

      const data = await res.json()

      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId
            ? {
                ...r,
                helpful: data.helpful,
                unhelpful: data.unhelpful,
                myVote: data.myVote
              }
            : r
        )
      )

      return true
    } catch {
      return false
    }
  }

  // ───────────────── AUTH ─────────────────
  const login = async (email: string, password: string) => {
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password
    })

setLoading(false)

    if (res?.error) {
      toast.error("Invalid credentials")
      return false
    }

    router.push("/dashboard/customer")
    return true
  }

 const googleLogin = async () => {
  setGoogleLoading(true)
  try {
    await signIn("google", { callbackUrl: "/dashboard/customer" })
  } catch {
    setError("Google login failed")
  } finally {
    setGoogleLoading(false)
  }
}

const goToCart = () => {
  router.push("/cart")
}
  // ───────────────── QUANTITY HELPERS ─────────────────
  const displayQuantity = (productId: string) => {
    const item = cart.find(i => String(i.product.id) === String(productId))
    return item?.quantity || 1
  }

  const increaseQuantity = (product: Product) => {
    const currentQty = displayQuantity(product.id)
    if (product.stock && currentQty >= product.stock) return
    toggleCart(product, 1)
  }

  const decreaseQuantity = (product: Product) => {
    const currentQty = displayQuantity(product.id)
    if (currentQty <= 1) return
    toggleCart(product, -1)
  }

  // ───────────────── PROVIDER ─────────────────
  return (
    <ShopContext.Provider
      value={{
        cart,
        wishlist,
        reviews,
        loading,
    googleLoading,
    error,
    fetchCart,
    wishlistLoading,
        cartUpdated,
        wishlistUpdated,
        toggleCart,
        toggleWishlist,
        fetchWishlist,
        loadReviews,
        submitReview,
        voteReview,
        login,
          getDashboardRoute,
  getTicketRoute,
  getOrderRoute,
       goToCart,

        googleLogin,
        displayQuantity,
        increaseQuantity,
        decreaseQuantity
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

// ───────────────── HOOK ─────────────────
export const useShop = () => {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error("useShop must be used within ShopProvider")
  return ctx
}