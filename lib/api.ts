

/**
 * useProductAPI
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns ALL network calls for the ProductPage.
 * ProductPage itself has zero fetch() — it only calls functions from this hook.
 *
 * Responsibilities:
 *  • Fetch reviews (with session-aware myVote injection)
 *  • Submit a new review
 *  • Vote on a review (optimistic + server-confirmed)
 *  • Fetch similar products
 *  • Upload review photos
 *
 * Security / Production considerations:
 *  • credentials: "include" on every call so session cookies are always sent
 *  • Exponential back-off retry on transient errors (5xx / network)
 *  • Request deduplication — duplicate in-flight GETs are collapsed
 *  • AbortController cleanup on unmount / productId change
 *  • No raw fetch() in components — all error surfaces go through typed Results
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { signIn, useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { getSession } from "next-auth/react";
// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewMetrics = {
  quality?:  number | null
  value?:    number | null
  design?:   number | null
  delivery?: number | null
}

export type Product = {
  id:            string
  title:          string
  price:          number
  weight?:        number
  stock?:         number
  model?:         string
  images:         string[]
  category?:      string
  description?:   string
  originalPrice?: number
  discountType?:  "PERCENTAGE" | "FIXED" | null
  discountPercent?: number
  discountValue?: number
  finalPrice?:    number
  rating?:        number | null
  reviews?:       number
  tag?:           "BEST_SELLER" | "TRENDING" | "NEW"
  totalSold?:     number
}
export type Review = {
  id:       string
  productId: string
  author:    string
  avatar:    string
  rating:    number
  createdAt: string
  title:     string
  body:      string
  verified:  boolean
  helpful:   number
  unhelpful: number
  photos?:   string[]
  metrics?:  ReviewMetrics
  myVote?:   "up" | "down" | null
  isOwner?:  boolean   // true when this review belongs to the logged-in user
}

export type VoteResult = {
  helpful:      number
  unhelpful:    number
  myVote:       "up" | "down"
  alreadyVoted: boolean
}

export type SubmitReviewPayload = {
  productId: string
  author:    string
  rating:    number
  title:     string
  body:      string
  photos:    File[]
  metrics:   ReviewMetrics
}

export type EditReviewPayload = {
  reviewId: string
  title:    string
  body:     string
  photos:   File[]           // new files to upload (empty = keep existing)
  metrics:  ReviewMetrics
  existingPhotoUrls: string[] // already-uploaded URLs to keep
}

// ─── Utility: fetch with retry ────────────────────────────────────────────────
// Retries up to `retries` times on network error or 5xx, with exponential back-off.
// Always sends session cookies.

function mapProduct(raw: any): Product {
  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images
    : raw.image ? [raw.image] : []
  return {
    id:           String(raw.id ?? ""),
    title:         raw.title || raw.name || "",
    price:         raw.price ?? 0,
    weight:        raw.weight ?? undefined,
    stock:         raw.stock,
    images:        rawImages.filter((img: string) => img?.trim()),
    category:      raw.category,
    description:   raw.description,
    originalPrice: raw.originalPrice,
    discountType:  raw.discountType  ?? null,
    discountPercent: raw.discountPercent ?? 0,
    discountValue: raw.discountValue ?? 0,
    finalPrice:    raw.finalPrice,
    rating:        raw.rating   ?? null,
    reviews:       raw.reviews  ?? 0,
    tag:           raw.tag,
    model: raw.model ?? null,
    totalSold:     raw.totalSold ?? 0,
  }
}

async function fetchWithRetry(
  url:     string,
  options: RequestInit = {},
  retries: number      = 2,
  delayMs: number      = 400,
): Promise<Response> {
  const opts: RequestInit = {
    ...options,
    credentials: "include",            // always send session cookie
    headers: {
      ...(options.headers ?? {}),
    },
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts)
      // Retry on 5xx server errors (not 4xx — those are client mistakes)
      if (res.status >= 500 && attempt < retries) {
        await sleep(delayMs * 2 ** attempt)
        continue
      }
      return res
    } catch (err) {
      // Network error — retry
      if (attempt < retries) {
        await sleep(delayMs * 2 ** attempt)
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// ─── In-flight deduplication map ─────────────────────────────────────────────
// Prevents two components simultaneously firing the same GET

const inflightGets = new Map<string, Promise<any>>()

async function deduplicatedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (inflightGets.has(key)) return inflightGets.get(key) as Promise<T>
  const promise = fetcher().finally(() => inflightGets.delete(key))
  inflightGets.set(key, promise)
  return promise
}


export function useProductAPI(
  productId?: string | null,
  sessionEmail?: string | null
) {
  const [reviews,        setReviews]        = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError,   setReviewsError]   = useState<string | null>(null)
const { data: session } = useSession()
  const [wishlist, setWishlist] = useState<string[]>([])

const [wishlistUpdated, setWishlistUpdated] = useState(false)
  const [similarProducts,        setSimilarProducts]        = useState<any[]>([])
  const [similarProductsLoading, setSimilarProductsLoading] = useState(false)

  const [cart, setCart] = useState<any[]>([]);
  const [cartUpdated, setCartUpdated] = useState(false);
  // Track the current abort controller so we can cancel on unmount / id change
  const abortRef = useRef<AbortController | null>(null)

  // ── Fetch reviews ───────────────────────────────────────────────────────────
  const loadReviews = useCallback(async (pid: string) => {
    // Cancel any previous in-flight reviews fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setReviewsLoading(true)
    setReviewsError(null)

    try {
      const data = await deduplicatedGet(`reviews:${pid}`, () =>
        fetchWithRetry(`/api/reviews?productId=${pid}`, { signal: controller.signal })
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json()
          })
      )

      if (controller.signal.aborted) return

      const arr: Review[] = Array.isArray(data) ? data : (data.reviews ?? [])

      // Validate shape — drop any malformed entries
      const valid = arr.filter(
        (r): r is Review =>
          !!r.id &&
          typeof r.author   === "string" &&
          typeof r.rating   === "number" &&
          typeof r.body     === "string" &&
          typeof r.title    === "string"
      )

      setReviews(valid)
    } catch (err: any) {
      if (err?.name === "AbortError") return
      console.error("[useProductAPI] loadReviews:", err)
      setReviewsError("Failed to load reviews. Please refresh.")
    } finally {
      if (!controller.signal.aborted) setReviewsLoading(false)
    }
  }, [])
// Get quantity for UI
const displayQuantity = (productId: string) => {
  const item = cart.find((i) => i.product.id === productId);
  return item?.quantity || 1;
};

// Increase quantity
const increaseQuantity = (product: Product) => {
  const currentQty = displayQuantity(product.id);

  if (product.stock && currentQty >= product.stock) return;

  toggleCart(product, currentQty + 1);
};

// Decrease quantity
const decreaseQuantity = (product: Product) => {
  const currentQty = displayQuantity(product.id);

  if (currentQty <= 1) {
    toggleCart(product, -999); // remove
  } else {
    toggleCart(product, currentQty - 1);
  }
};
  // ── Fetch similar products ──────────────────────────────────────────────────
  const loadSimilarProducts = useCallback(async (category: string, excludeId: string) => {
    setSimilarProductsLoading(true)
    try {
      const data = await deduplicatedGet(`similar:${category}:${excludeId}`, () =>
        fetchWithRetry(`/api/products?category=${encodeURIComponent(category)}&limit=6`)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json()
          })
      )
      const arr = Array.isArray(data) ? data : (data.products ?? [])
      setSimilarProducts(arr.filter((p: any) => p.id !== excludeId).slice(0, 5))
    } catch (err) {
      console.error("[useProductAPI] loadSimilarProducts:", err)
      // Non-critical — silently swallow
    } finally {
      setSimilarProductsLoading(false)
    }
  }, [])

  // ── Auto-fetch when productId OR session changes ───────────────────────────
  // sessionEmail is included so that when the user logs in after page load,
  // we re-fetch with their cookie — server then returns correct isOwner + myVote.
  useEffect(() => {
    if (!productId) return
    // Bust the dedup cache for this key so the new fetch always fires
    inflightGets.delete(`reviews:${productId}`)
    loadReviews(productId)
    return () => abortRef.current?.abort()
  }, [productId, sessionEmail, loadReviews])

  const voteReview = async (reviewId: string, vote: "up" | "down") => {
  try {
    const res = await fetch(`/api/reviews/${reviewId}/vote`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote }),
    })

    if (res.status === 401) return null
    if (!res.ok) return false

    const data = await res.json()

    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? {
              ...r,
              helpful: data.helpful,
              unhelpful: data.unhelpful,
              myVote: data.myVote,
            }
          : r
      )
    )

    return true
  } catch (err) {
    console.error("Vote error", err)
    return false
  }
}
const requireAuth = () => {
  if (!session) {
    signIn(undefined, { callbackUrl: window.location.href });
    return false;
  }
  return true;
};
  // ── Upload photos ───────────────────────────────────────────────────────────
  const uploadPhotos = useCallback(async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return []
    try {
      const fd = new FormData()
      files.forEach(f => fd.append("photos", f))
      const res = await fetchWithRetry("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`)
      const data = await res.json()
      return (data.urls ?? []) as string[]
    } catch (err) {
      console.error("[useProductAPI] uploadPhotos:", err)
      return []
    }
  }, [])
const toggleWishlist = async (productId: string) => {
  if (!requireAuth()) return;

  let message = "";

  setWishlist((prev) => {
    const exists = prev.includes(productId);

    if (exists) {
      message = "Removed from wishlist";
      return prev.filter((id) => id !== productId);
    } else {
      message = "Added to wishlist";
      return [...prev, productId];
    }
  });

  setWishlistUpdated((prev) => !prev);
  if (message) toast.success(message);

  try {
    const res = await fetch("/api/wishlist/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        action: wishlist.includes(productId) ? "remove" : "add",
      }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Wishlist API returned non-JSON (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    setWishlist(data.items);
  } catch (err) {
    console.error("Wishlist error:", err);
    toast.error("Wishlist sync failed");
  }
};
useEffect(() => {
  const loadCart = async () => {
    const session = await getSession();
    if (!session) return;

    try {
     const res = await fetch("/api/cart");

if (!res.ok) return;

let data = null;

try {
  data = await res.json();
} catch (err) {
  console.error("Invalid JSON from /api/cart");
  return;
}

if (data?.success && data?.items) {
  setCart(
    data.items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity,
    }))
  );
}

      if (data.success && data.items) {
        setCart(
          data.items.map((item: any) => ({
            // CRITICAL: Use mapProduct to ensure ID is a String and fields match
            product: mapProduct(item.product), 
            quantity: item.quantity,
          }))
        );
        // Trigger a refresh for any listeners (like the Header animation)
        setCartUpdated(prev => !prev);
      }
    } catch (err) {
      console.error("Load cart failed", err);
    }
  };

  loadCart();
}, []);
useEffect(() => {
  const loadWishlist = async () => {
    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/wishlist/add");
      if (!res.ok) return;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("Invalid response type from /api/wishlist/add");
        return;
      }

      const data = await res.json();

      if (data.success) {
        setWishlist(data.items);
      }
    } catch (err) {
      console.error("Wishlist load failed", err);
    }
  };

  loadWishlist();
}, []);
// ─── Hook ─────────────────────────────────────────────────────────────────────
const toggleCart = async (product: Product, qty: number) => {
  if (!requireAuth()) return;

  const isRemove = qty === -999;

  // ✅ Decide API route properly
  let apiUrl = "/api/cart"; // add
  const exists = cart.some(i => i.product.id === product.id);

  if (isRemove) {
    apiUrl = "/api/cart/remove";
  } else if (exists) {
    apiUrl = "/api/cart/update";
  }

  // ✅ Optimistic UI
  setCart((prev) => {
    if (isRemove) {
      return prev.filter(i => i.product.id !== product.id);
    }

    const existing = prev.find(i => i.product.id === product.id);

    if (existing) {
      return prev.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: qty }
          : i
      );
    }

    return [...prev, { product, quantity: qty }];
  });

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: product.id,
        quantity: isRemove ? 0 : qty,
        remove: isRemove, // ✅ important for remove route
      }),
    });

    // ✅ Safe JSON parsing (prevents "Unexpected end of JSON")
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Cart sync failed");
    }

    // ✅ Sync with DB
    setCart(
      (data.items || []).map((item: any) => ({
        product: item.product,
        quantity: item.quantity,
      }))
    );

    setCartUpdated(prev => !prev);

  } catch (err: any) {
    console.error("Cart error:", err);
    toast.error(err.message || "Failed to update cart");
  }
};
  // ── Submit review ───────────────────────────────────────────────────────────
  const submitReview = useCallback(async (
    payload: SubmitReviewPayload,
  ): Promise<{ ok: true; review: Review } | { ok: false; error: string }> => {
    try {
      // Upload photos first (if any)
      const photoUrls = await uploadPhotos(payload.photos)

      const res = await fetchWithRetry("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: payload.productId,
          author:    payload.author,
          rating:    payload.rating,
          title:     payload.title,
          body:      payload.body,
          photos:    photoUrls,
          metrics:   payload.metrics,
        }),
      })

      if (res.status === 401) return { ok: false, error: "Please log in to submit a review." }
      if (res.status === 400) {
        const err = await res.json()
        return { ok: false, error: err.error ?? "Invalid review data." }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const newReview: Review = await res.json()

      // Prepend to local state — user sees their review instantly
      // isOwner: true ensures Edit/Delete buttons appear without waiting for a refetch
      setReviews(prev => [{ ...newReview, myVote: null, isOwner: true }, ...prev])

      return { ok: true, review: newReview }
    } catch (err) {
      console.error("[useProductAPI] submitReview:", err)
      return { ok: false, error: "Something went wrong. Please try again." }
    }
  }, [uploadPhotos])

  // ── Edit own review ─────────────────────────────────────────────────────────
  const editReview = useCallback(async (
    payload: EditReviewPayload,
  ): Promise<{ ok: true; review: Review } | { ok: false; error: string }> => {
    try {
      // Upload any new photos the user added
      const newUrls     = await uploadPhotos(payload.photos)
      const allPhotoUrls = [...payload.existingPhotoUrls, ...newUrls]

      const res = await fetchWithRetry("/api/reviews", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: payload.reviewId,
          title:    payload.title,
          body:     payload.body,
          photos:   allPhotoUrls,
          metrics:  payload.metrics,
        }),
      })

      if (res.status === 401) return { ok: false, error: "Please log in." }
      if (res.status === 404) return { ok: false, error: "Review not found." }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const updated: Review = await res.json()

      // Patch in local state — preserve isOwner so Edit/Delete buttons don't vanish
      setReviews(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated, isOwner: true } : r))

      return { ok: true, review: updated }
    } catch (err) {
      console.error("[useProductAPI] editReview:", err)
      return { ok: false, error: "Failed to update review. Please try again." }
    }
  }, [uploadPhotos])
const fetchProduct = useCallback(async (id: string): Promise<Product | null> => {
  try {
    const data = await deduplicatedGet(`product:${id}`, () =>
      fetchWithRetry(`/api/products/${id}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
    )
    return mapProduct(data)
  } catch (err) {
    console.error("[ShopContext] fetchProduct:", err)
    return null
  }
}, [])
 
  // ── Delete own review ───────────────────────────────────────────────────────
  const deleteReview = useCallback(async (
    reviewId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const res = await fetchWithRetry("/api/reviews", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      })

      if (res.status === 401) return { ok: false, error: "Please log in." }
      if (res.status === 404) return { ok: false, error: "Review not found." }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Remove from local state immediately — no refetch needed
      setReviews(prev => prev.filter(r => r.id !== reviewId))

      return { ok: true }
    } catch (err) {
      console.error("[useProductAPI] deleteReview:", err)
      return { ok: false, error: "Failed to delete review. Please try again." }
    }
  }, [])

  // ── Derived: current user's own review (if any) ─────────────────────────────
  // Computed from reviews[] — isOwner is set by the server on GET
  // Used by ProductPage to decide "Write Review" vs "Edit Review"

  return {
    // Reviews state
    reviews,
    reviewsLoading,
    reviewsError,
    // Similar products state
    similarProducts,
    similarProductsLoading,
    // Actions
    loadSimilarProducts,
    voteReview,
    submitReview,
    editReview,
    deleteReview,
    cart, toggleCart, cartUpdated,
    increaseQuantity,
    toggleWishlist,
  decreaseQuantity,
  displayQuantity,
    
    /** Re-fetch reviews (e.g. after posting a review to sync server state) */
    refreshReviews: () => productId ? loadReviews(productId) : Promise.resolve(),
    fetchProduct,
  }
}

