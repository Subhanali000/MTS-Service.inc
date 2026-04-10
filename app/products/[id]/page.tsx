"use client"

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import {
  Heart, ShoppingCart, ArrowRight, Star, Shield, RotateCcw, Truck,
  ChevronLeft, ChevronRight, Minus, Plus, Share2, Crown, Flame, Sparkles,
  ThumbsUp, ThumbsDown, Camera, CheckCircle, Package, Clock, Award,
  ChevronDown, X, ZoomIn, Loader2, ArrowLeft
} from "lucide-react"
import { useShop, Product as ShopProduct } from "@/app/context/ShopContext"
import { useProductAPI, type Review, type SubmitReviewPayload, type EditReviewPayload } from "@/lib/api"
import { getCatalogDiscountAmount, getCatalogDiscountPercent, getCatalogEffectivePrice, getCatalogOriginalEffectivePrice } from "@/lib/pricing"
import { useRouter, usePathname,useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

// ─── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  product: Product;
  quantity: number;
};
type Product = ShopProduct & {
    id?:string
    model?:string
  discountType?: "PERCENTAGE" | "FIXED" | null
  discountPercent?: number
  discountValue?: number
  finalPrice?: number
  description?: string
  totalSold?: number
  category?: string
  stock?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)       return "just now"
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000)  return `${Math.floor(diff / 86400)} days ago`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`
  return `${Math.floor(diff / 31536000)} years ago`
}

function getInitials(name: string): string {
  if (!name || typeof name !== "string") return "?"
  return name.split(" ").map(n => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?"
}

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
]

// ✅ Pure function — no hooks, safe outside components
function avatarColor(name: string): string {
  if (!name || typeof name !== "string") return AVATAR_COLORS[0]
  let sum = 0
  for (const c of name) sum += c.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

const validImg = (src?: string | null) =>
  src && src.trim() !== "" ? src : "/images/No_Image_Available.jpg"

// ─── Config ───────────────────────────────────────────────────────────────────

const tagConfig = {
  BEST_SELLER: { icon: <Crown size={11} />,    style: "bg-amber-100 text-amber-700 border border-amber-200",       label: "Best Seller"  },
  TRENDING:    { icon: <Flame size={11} />,     style: "bg-rose-100 text-rose-600 border border-rose-200",          label: "Trending"     },
  NEW:         { icon: <Sparkles size={11} />,  style: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "New Arrival"  },
}

// ─── StarRow ──────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 16, interactive = false, onChange }: {
  rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size}
          onClick={() => interactive && onChange?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${interactive ? "cursor-pointer" : ""} ${
            s <= (hover || Math.round(rating))
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-100 text-gray-300"
          }`}
        />
      ))}
    </div>
  )
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({ review, onVote, isLoggedIn, myVote: initialVote, onEdit }: {
  review: Review
  onVote: (id: string, vote: "up" | "down") => void
  isLoggedIn: boolean
  myVote: "up" | "down" | null
  onEdit?: (action?: "delete") => void
}) {
  const [confirmedVote, setConfirmedVote] = useState<"up" | "down" | null>(initialVote)
  const [pendingVote,   setPendingVote]   = useState<"up" | "down" | null>(null)
  const [expanded,      setExpanded]      = useState(false)
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null)

  useEffect(() => {
    if (initialVote !== null) {
      setConfirmedVote(initialVote)
      setPendingVote(null)
    }
  }, [initialVote])

  const voted = confirmedVote ?? pendingVote

  const handleVote = (v: "up" | "down") => {
    if (!isLoggedIn || voted) return
    setPendingVote(v)
    onVote(review.id, v)
  }

  const helpfulCount   = (review.helpful   ?? 0) + (pendingVote === "up"   && !confirmedVote ? 1 : 0)
  const unhelpfulCount = (review.unhelpful ?? 0) + (pendingVote === "down" && !confirmedVote ? 1 : 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColor(review.author ?? "")} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
            {review.avatar || getInitials(review.author ?? "")}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{review.author ?? "Anonymous"}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle size={9} /> Verified
                </span>
              )}
              {review.isOwner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                  Your review
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
          </div>
        </div>
        <StarRow rating={review.rating} size={13} />
      </div>

      <h4 className="font-semibold text-gray-800 text-sm mb-1.5">{review.title ?? ""}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">
        {(() => {
          const body = review.body ?? ""
          return (
            <>
              {expanded || body.length < 160 ? body : <>{body.slice(0, 160)}…</>}
              {body.length >= 160 && (
                <button onClick={() => setExpanded(!expanded)} className="ml-1 text-pink-500 font-medium hover:underline text-xs">
                  {expanded ? "show less" : "read more"}
                </button>
              )}
            </>
          )
        })()}
      </p>

      {(review.photos ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(review.photos ?? []).map((url, i) => (
            <button key={i} type="button"
              onClick={() => setLightboxUrl(url)}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:scale-105 transition-all shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={28} /></button>
          <div className="relative w-full max-w-lg aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Review photo" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-gray-50">
        {isLoggedIn ? (
          <>
            <span className="text-xs text-gray-400">Helpful?</span>
            <button onClick={() => handleVote("up")} disabled={!!voted}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                voted === "up" ? "bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed"
                : voted ? "opacity-40 cursor-not-allowed text-gray-400 border-gray-200"
                : "text-gray-500 border-gray-200 hover:border-gray-300"
              }`}>
              <ThumbsUp size={12} /> {helpfulCount}
            </button>
            <button onClick={() => handleVote("down")} disabled={!!voted}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                voted === "down" ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed"
                : voted ? "opacity-40 cursor-not-allowed text-gray-400 border-gray-200"
                : "text-gray-500 border-gray-200 hover:border-gray-300"
              }`}>
              <ThumbsDown size={12} /> {unhelpfulCount}
            </button>
          </>
        ) : (
          <button title="Login to mark as helpful"
            className="flex items-center gap-1.5 text-xs text-gray-300 cursor-not-allowed select-none">
            <ThumbsUp size={12} className="opacity-40" />
            <span className="opacity-40">{review.helpful ?? 0}</span>
            <span className="text-[10px] text-gray-300 ml-1">· Login to vote</span>
          </button>
        )}
        {onEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => onEdit()}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-amber-50 border border-amber-200 transition">
              Edit
            </button>
            <button onClick={() => onEdit("delete")}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-red-100 transition">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SimilarProductCard ───────────────────────────────────────────────────────

function SimilarProductCard({ product, onClick }: { product: Partial<Product>; onClick: () => void }) {
  const displayPrice = getCatalogEffectivePrice(product)
  const originalDisplayPrice = getCatalogOriginalEffectivePrice(product)
  const hasDiscount  = originalDisplayPrice !== null
  const hasRating    = ((product as any).reviews ?? 0) > 0

  return (
    <div onClick={onClick} className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative h-40 overflow-hidden bg-gray-50">
        <Image src={validImg(product.images?.[0])} alt={product.title || ""} fill
          className="object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.tag && (
          <div className={`absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagConfig[product.tag].style}`}>
            {tagConfig[product.tag].icon} {tagConfig[product.tag].label}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5">{product.title}</p>
        {hasRating ? (
          <div className="flex items-center gap-1 mb-1.5">
            <StarRow rating={(product as any).rating ?? 0} size={11} />
            <span className="text-[10px] text-gray-400">({(product as any).reviews})</span>
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 mb-1.5">No reviews yet</p>
        )}
        <div className="flex items-baseline gap-1.5 mt-1.5">
          {hasDiscount && <span className="text-xs line-through text-gray-400">₹{originalDisplayPrice?.toLocaleString("en-IN")}</span>}
          <span className="text-base font-bold text-pink-600">₹{displayPrice}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ onClose, onConfirm }: {
  onClose:   () => void
  onConfirm: () => Promise<{ ok: boolean; error?: string }>
}) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState("")

  const handleDelete = async () => {
    setDeleting(true)
    setError("")
    const result = await onConfirm()
    setDeleting(false)
    if (!result.ok) setError(result.error ?? "Failed to delete.")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="text-red-400" size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Review?</h3>
        <p className="text-sm text-gray-500 mb-6">This can&apos;t be undone. Your review will be permanently removed.</p>
        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

type ReviewModalMode = "create" | "edit"

function ReviewModal({
  productId, userName, mode, existingReview, onClose, onSubmit, onEdit,
}: {
  productId:       string
  userName:        string
  mode:            ReviewModalMode
  existingReview?: Review | null
  onClose:  () => void
  onSubmit: (payload: SubmitReviewPayload) => Promise<{ ok: boolean; error?: string }>
  onEdit:   (payload: EditReviewPayload)   => Promise<{ ok: boolean; error?: string }>
}) {
  const toMetricsState = (m?: Review["metrics"]) => ({
    quality:  m?.quality  ?? 0,
    value:    m?.value    ?? 0,
    design:   m?.design   ?? 0,
    delivery: m?.delivery ?? 0,
  })

  const [localMetrics,       setLocalMetrics]       = useState(() => toMetricsState(existingReview?.metrics))
  const [title,              setTitle]              = useState(existingReview?.title ?? "")
  const [body,               setBody]               = useState(existingReview?.body  ?? "")
  const [submitting,         setSubmitting]         = useState(false)
  const [done,               setDone]               = useState<"submitted" | "edited" | null>(null)
  const [error,              setError]              = useState("")
  const [newPhotos,          setNewPhotos]          = useState<{ file: File; preview: string }[]>([])
  const [existingPhotoUrls,  setExistingPhotoUrls]  = useState<string[]>(existingReview?.photos ?? [])

  const totalPhotoCount = existingPhotoUrls.length + newPhotos.length
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const cameraInputRef  = useRef<HTMLInputElement>(null)

  const metricsAvg = (() => {
    const vals = Object.values(localMetrics).filter(v => v > 0)
    if (vals.length === 0) return 5
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  })()

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const slots = 5 - totalPhotoCount
    if (slots <= 0) return
    const next = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .slice(0, slots)
      .map(file => ({ file, preview: URL.createObjectURL(file) }))
    setNewPhotos(prev => [...prev, ...next])
  }

  const removeNewPhoto      = (idx: number) => {
    setNewPhotos(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx) })
  }
  const removeExistingPhoto = (url: string) =>
    setExistingPhotoUrls(prev => prev.filter(u => u !== url))

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true); setError("")
    let result: { ok: boolean; error?: string }
    if (mode === "create") {
      result = await onSubmit({ productId, author: userName, rating: metricsAvg, title: title.trim(), body: body.trim(), photos: newPhotos.map(p => p.file), metrics: localMetrics })
      if (result.ok) setDone("submitted")
    } else {
      result = await onEdit({ reviewId: existingReview!.id, title: title.trim(), body: body.trim(), photos: newPhotos.map(p => p.file), existingPhotoUrls, metrics: localMetrics })
      if (result.ok) setDone("edited")
    }
    setSubmitting(false)
    if (!result.ok) setError(result.error ?? "Something went wrong.")
  }

  if (done === "submitted" || done === "edited") return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-emerald-500" size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {done === "submitted" ? "Review Submitted!" : "Review Updated!"}
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {done === "submitted" ? "Thank you! Your review helps other shoppers." : "Your review has been updated."}
        </p>
        <button onClick={onClose} className="w-full bg-pink-600 text-white py-3 rounded-xl font-semibold hover:bg-pink-700 transition">Done</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <input ref={fileInputRef}   type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{mode === "create" ? "Write a Review" : "Edit Your Review"}</h3>
            {mode === "edit" && <p className="text-xs text-gray-400 mt-0.5">Changes are saved immediately</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-3 mb-5 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <div className={`w-8 h-8 rounded-full bg-linear-to-br ${avatarColor(userName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {getInitials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Posting as</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
          </div>
          {mode === "edit" && <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Editing</span>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rate by Category <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
              {(["quality", "value", "design", "delivery"] as const).map(key => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-600 w-16 shrink-0">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button"
                        onClick={() => setLocalMetrics(prev => ({ ...prev, [key]: prev[key] === s ? 0 : s }))}
                        className="transition-transform hover:scale-125 active:scale-95 p-0.5">
                        <Star size={18} className={s <= localMetrics[key] ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
                      </button>
                    ))}
                  </div>
                  <span className={`text-xs font-bold w-8 text-right shrink-0 ${localMetrics[key] > 0 ? "text-pink-600" : "text-gray-300"}`}>
                    {localMetrics[key] > 0 ? `${localMetrics[key]}.0` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Review Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summarise your experience"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Review <span className="text-red-500">*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value.slice(0, 1000))} rows={4}
              placeholder="What did you like or dislike? How was the quality?"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition resize-none" />
            <p className={`text-[11px] mt-1 ${body.length >= 950 ? "text-amber-500" : "text-gray-400"}`}>{body.length}/1000</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Photos <span className="text-gray-400 font-normal text-xs">(optional · max 5)</span></label>
            {(existingPhotoUrls.length > 0 || newPhotos.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingPhotoUrls.map(url => (
                  <div key={url} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExistingPhoto(url)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-black/80 transition">
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {newPhotos.map((p, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-pink-300 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewPhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-black/80 transition">
                      <X size={9} />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-pink-500/80 text-center leading-tight py-0.5">New</span>
                  </div>
                ))}
              </div>
            )}
            {totalPhotoCount < 5 && (
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs font-medium text-gray-500 hover:border-pink-300 hover:text-pink-500 transition">
                  <Camera size={15} /> Upload
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs font-medium text-gray-500 hover:border-pink-300 hover:text-pink-500 transition">
                  <Camera size={15} /> Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="button" disabled={!title.trim() || !body.trim() || submitting} onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> {mode === "create" ? "Submitting…" : "Saving…"}</>
              : mode === "create" ? "Submit Review" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ProductPage ─────────────────────────────────────────────────────────

export default function ProductPage({ product: initialProduct }: { product?: Product }) {
  const router   = useRouter()
  const pathname = usePathname()
 const { toggleCart, toggleWishlist, wishlist, cart } = useShop()


  // ✅ useSession INSIDE the component — only place it belongs
  const { data: session, status: sessionStatus } = useSession()
const searchParams = useSearchParams()
const query = searchParams.get("q")
  // ✅ mounted guard — prevents hydration mismatch from useSession
  const [mounted, setMounted] = useState(false)

  const [product,           setProduct]           = useState<Product | null>(initialProduct || null)
  const [loading,           setLoading]           = useState(!initialProduct)
  const [selectedImage,     setSelectedImage]     = useState(0)
  const [quantity,          setQuantity]          = useState(1)
  const [tab,               setTab]               = useState<"description" | "details" | "shipping">("description")
  const [zoomed,            setZoomed]            = useState(false)
  const [mousePos,          setMousePos]          = useState({ x: 50, y: 50 })
  const [showReviewModal,   setShowReviewModal]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reviewPage,        setReviewPage]        = useState(1)
  const [lightboxImg,       setLightboxImg]       = useState<string | null>(null)
  const [pinned,            setPinned]            = useState(false)

  const REVIEWS_PER_PAGE = 6
  const productId = pathname?.split("/").filter(Boolean).pop()
  const ctaRef    = useRef<HTMLDivElement>(null)

  const {
    reviews, reviewsLoading, reviewsError, similarProducts,
    voteReview, submitReview, editReview, deleteReview, loadSimilarProducts,
  } = useProductAPI(product?.id ?? null, session?.user?.email ?? null)

  const userReview = reviews.find(r => r.isOwner) ?? null
const {
  fetchProduct,
 
} = useProductAPI(product?.id ?? null, session?.user?.email ?? null)

  // ── ALL useEffects together ────────────────────────────────────────────────

  // ✅ mounted — must be first effect
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setPinned(!e.isIntersecting), { threshold: 0 })
    if (ctaRef.current) obs.observe(ctaRef.current)
    return () => obs.disconnect()
  }, [product])

 useEffect(() => {
  if (initialProduct) return
  if (!productId) { router.push("/"); return }

  fetchProduct(productId)
    .then((data: Product | null) => {
      if (data) setProduct(data)
      else router.push("/")
    })
    .finally(() => setLoading(false))
}, [productId])

  useEffect(() => {
    if (product?.category && product.id) {
      loadSimilarProducts(product.category, product.id)
    }
  }, [product?.category, product?.id, loadSimilarProducts])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleVote = async (reviewId: string, vote: "up" | "down") => {
    const result = await voteReview(reviewId, vote)
    if (!result) router.push("/login")
  }

  // Buy now supports guest checkout through the dedicated buy-now route.
  const handleBuyNow = () => {
    if (!mounted) return
    if (!product?.id) return
    router.push(`/buy-now?productId=${product.id}&qty=${isInCart ? cartQty : quantity}`)
  }

  // ── Early returns AFTER all hooks ─────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-3xl bg-linear-to-br from-gray-200 to-gray-100 animate-pulse" />
        <div className="flex flex-col gap-5 pt-4">
          {[["w-1/4","h-5"],["w-3/4","h-8"],["w-1/2","h-8"],["w-1/3","h-6"],["w-full","h-14"],["w-full","h-14"]].map(([w,h],i) => (
            <div key={i} className={`${w} ${h} bg-gray-200 rounded-xl animate-pulse`} style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (!product) return null

  // ── Derived values ─────────────────────────────────────────────────────────

const isInCart = cart.some((i: CartItem) => i.product.id === product.id)
const cartItem = cart.find((i: CartItem) => i.product.id === product.id)
  const cartQty      = cartItem?.quantity ?? 0
  const isWishlisted = wishlist.includes(product.id)
  const displayPrice = getCatalogEffectivePrice(product)
  const originalDisplayPrice = getCatalogOriginalEffectivePrice(product)
  const hasDiscount = originalDisplayPrice !== null
  const discountPercent = getCatalogDiscountPercent(product)
  const discountAmount = getCatalogDiscountAmount(product)

  const images     = (product.images ?? []).filter(img => img && img.trim() !== "")
  const safeImages = images.length > 0 ? images : ["/images/No_Image_Available.jpg"]
const sku = product.model?.toUpperCase()

  const totalReviews = reviews.length
  const avgRating = (() => {
    const allMetricVals: number[] = reviews.flatMap(r =>
      (["quality", "value", "design", "delivery"] as const)
        .map(k => (r as any).metrics?.[k])
        .filter((v): v is number => typeof v === "number" && v > 0)
    )
    if (allMetricVals.length > 0) {
      return Math.round((allMetricVals.reduce((s, v) => s + v, 0) / allMetricVals.length) * 10) / 10
    }
    if (totalReviews === 0) return 0
    return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
  })()

  const metricBreakdown = (["quality", "value", "design", "delivery"] as const).map(key => {
    const vals = reviews.map(r => (r as any).metrics?.[key]).filter((v): v is number => typeof v === "number" && v > 0)
    const avg  = vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null
    return { key, label: key.charAt(0).toUpperCase() + key.slice(1), avg, percent: avg !== null ? (avg / 5) * 100 : 0 }
  })

  const standardDeliveryWindow = "3-5"
  const expressDeliveryWindow = "1-2"
  const returnDays = 7

  const paginatedReviews = reviews.slice(0, reviewPage * REVIEWS_PER_PAGE)
  const hasMoreReviews   = paginatedReviews.length < reviews.length

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8f7f5] font-sans">

      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={28} /></button>
          <div className="relative w-full max-w-2xl aspect-square">
            <Image src={lightboxImg} alt="Product" fill className="object-contain" />
          </div>
        </div>
      )}

      {showDeleteConfirm && userReview && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            const result = await deleteReview(userReview.id)
            if (result.ok) setShowDeleteConfirm(false)
            return result
          }}
        />
      )}

      {showReviewModal && (
        <ReviewModal
          productId={String(product.id)}
          userName={session?.user?.name ?? "Anonymous"}
          mode={userReview ? "edit" : "create"}
          existingReview={userReview}
          onClose={() => setShowReviewModal(false)}
          onSubmit={async (payload) => { const r = await submitReview(payload); if (r.ok) setShowReviewModal(false); return r }}
          onEdit={async (payload)   => { const r = await editReview(payload);   if (r.ok) setShowReviewModal(false); return r }}
        />
      )}

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          <button onClick={() => router.push("/")} className="hover:text-pink-500 transition">Home</button>
          <ChevronRight size={12} />
          {product.category && <>
            <button onClick={() => router.push(`/category/${product.category}`)} className="hover:text-pink-500 transition capitalize">{product.category}</button>
            <ChevronRight size={12} />
          </>}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-transparent px-1.5 py-1 font-medium text-gray-700 transition-colors hover:text-rose-600"
            aria-label="Go back"
          >
            <ArrowLeft size={12} className="text-rose-500" />
            <span>Back</span>
          </button>
        </nav>
      </div>

      {/* Main Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">

          {/* LEFT: Gallery */}
          <div className="flex flex-col gap-4">
            <div
              className="relative w-full aspect-square rounded-3xl overflow-hidden bg-white shadow-md cursor-zoom-in select-none border border-gray-100"
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              {hasDiscount && (
                <div className="absolute top-4 left-4 z-10 bg-linear-to-r from-pink-600 to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  {discountPercent}% OFF
                </div>
              )}
              {product.tag && (
                <div className={`absolute top-4 right-14 z-10 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${tagConfig[product.tag].style}`}>
                  {tagConfig[product.tag].icon} {tagConfig[product.tag].label}
                </div>
              )}
              <button onClick={() => setLightboxImg(safeImages[selectedImage])}
                className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur p-2 rounded-full shadow hover:bg-white transition">
                <ZoomIn size={16} className="text-gray-600" />
              </button>
              <div className="w-full h-full transition-transform duration-150"
                style={zoomed ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%`, transform: "scale(2.2)" } : {}}>
                <Image src={safeImages[selectedImage]} alt={product.title} fill className="object-cover" priority />
              </div>
              {safeImages.length > 1 && <>
                <button onClick={() => setSelectedImage(p => (p - 1 + safeImages.length) % safeImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full shadow hover:bg-white transition z-10">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setSelectedImage(p => (p + 1) % safeImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full shadow hover:bg-white transition z-10">
                  <ChevronRight size={18} />
                </button>
              </>}
              {safeImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {safeImages.map((_, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`rounded-full transition-all ${i === selectedImage ? "w-5 h-1.5 bg-pink-500" : "w-1.5 h-1.5 bg-white/60"}`} />
                  ))}
                </div>
              )}
            </div>

            {safeImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {safeImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`relative shrink-0 w-18 h-18 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === i ? "border-pink-500 shadow-md scale-105" : "border-transparent opacity-50 hover:opacity-80"
                    }`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Delivery card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Truck size={18} className="text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Standard Delivery Included</p>
                  <p className="text-[11px] text-gray-400">Delivered in {standardDeliveryWindow} business days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                <Package size={18} className="text-pink-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Express Delivery - Extra at checkout</p>
                  <p className="text-[11px] text-gray-400">Get it in {expressDeliveryWindow} business days based on pincode and payment method</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                <RotateCcw size={18} className="text-pink-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{returnDays}-Day Easy Returns</p>
                  <p className="text-[11px] text-gray-400">No questions asked return policy</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              {product.category && <span className="text-xs font-semibold text-pink-500 uppercase tracking-widest">{product.category}</span>}
              <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-md">SKU: {sku}</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">{product.title}</h1>
              <button onClick={() => toggleWishlist(product.id)}
                className={`shrink-0 mt-1 p-2.5 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${
                  isWishlisted ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
                }`}>
                <Heart size={20} className={isWishlisted ? "text-red-500 fill-red-500" : "text-gray-400"} />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {totalReviews > 0 ? (
                <>
                  <StarRow rating={avgRating} size={16} />
                  <span className="font-bold text-gray-900 text-sm">{avgRating.toFixed(1)}</span>
                  <button
                    onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="text-gray-400 text-sm hover:text-pink-500 transition underline underline-offset-2">
                    {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                  </button>
                  <span className="w-px h-4 bg-gray-200" />
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">No reviews yet</span>
              )}
              <span className="text-sm text-gray-500">{product.totalSold ?? 0} sold</span>
            </div>

            {/* Price */}
            <div className="bg-linear-to-r from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-100">
              <div className="flex items-end gap-3 flex-wrap" dir="ltr">
                <span className="text-4xl font-black text-pink-600 tracking-tight">₹{Math.round(displayPrice).toLocaleString("en-IN")}</span>
                {hasDiscount && <span className="text-lg line-through text-gray-400">₹{Math.round(originalDisplayPrice ?? 0).toLocaleString("en-IN")}</span>}
                {hasDiscount && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full mb-1">
                    Save ₹{Math.round(discountAmount).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Inclusive of all taxes · <span className="text-emerald-600 font-semibold">Free Delivery</span>
              </p>
            </div>

            {/* Stock */}
            <div className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg w-fit ${
              (product.stock ?? 0) > 10 ? "bg-emerald-50 text-emerald-700" :
              (product.stock ?? 0) > 0  ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-600"
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                (product.stock ?? 0) > 10 ? "bg-emerald-500 animate-pulse" :
                (product.stock ?? 0) > 0  ? "bg-amber-500" : "bg-red-500"
              }`} />
              {(product.stock ?? 0) > 10 ? "In Stock — Ready to ship"
                : (product.stock ?? 0) > 0 ? `Only ${product.stock}  left in stock!`
                : "Out of Stock"}
            </div>

            <hr className="border-gray-100" />

            {/* Quantity */}
            <div className="flex items-center gap-5">
              <span className="text-sm font-semibold text-gray-700">Quantity</span>
              <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => { if (isInCart) toggleCart(product, -1); else setQuantity(q => Math.max(1, q - 1)) }}
                  className="px-4 py-2.5 hover:bg-gray-50 transition text-gray-500">
                  <Minus size={15} />
                </button>
                <span className="px-5 py-2.5 text-sm font-bold text-gray-800 border-x border-gray-200 min-w-11 text-center">
                  {isInCart ? cartQty : quantity}
                </span>
                <button
                  onClick={() => {
                    if (isInCart) { if (cartQty < (product.stock ?? 99)) toggleCart(product, 1) }
                    else setQuantity(q => Math.min(product.stock ?? 99, q + 1))
                  }}
                  disabled={(isInCart ? cartQty : quantity) >= (product.stock ?? 99)}
                  className="px-4 py-2.5 hover:bg-gray-50 transition text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Plus size={15} />
                </button>
              </div>
              {isInCart && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <ShoppingCart size={11} /> In cart
                </span>
              )}
            </div>

            {/* CTA buttons */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={(product.stock ?? 0) === 0}
                onClick={() => { if (isInCart) router.push("/cart"); else toggleCart(product, quantity) }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                  isInCart ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-900 text-white hover:bg-gray-800"
                }`}>
                {isInCart ? <ArrowRight size={18} /> : <ShoppingCart size={18} />}
                {isInCart ? `Go to Cart (${cartQty})` : "Add to Cart"}
              </button>
              <button
                disabled={(product.stock ?? 0) === 0}
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-linear-to-r from-pink-600 to-rose-500 text-white hover:from-pink-700 hover:to-rose-600 transition-all active:scale-95 shadow-md shadow-pink-200 disabled:opacity-40 disabled:cursor-not-allowed">
                Buy Now
              </button>
            </div>

            {/* Share */}
            <div className="flex items-center justify-between">
              <button onClick={() => navigator.share?.({ title: product.title, url: window.location.href })}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition">
                <Share2 size={14} /> Share
              </button>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} /> Usually ships in 1–2 days
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex border-b border-gray-100">
                {(["description", "details", "shipping"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition border-b-2 -mb-px ${
                      tab === t ? "border-pink-500 text-pink-600 bg-pink-50/50" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}>{t}</button>
                ))}
              </div>
              <div className="p-5">
                {tab === "description" && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {product.description || "Premium quality product crafted with care. Perfect for everyday use and gifting."}
                  </p>
                )}
                {tab === "details" && (
                  <div>
                    {[
                      ["Category",   product.category ?? "—"],
                      ["SKU",        sku],
                      ["Stock",      `${product.stock ?? 0} units`],
                      ["Total Sold", `${product.totalSold ?? 0} units`],
                      ["Rating",     totalReviews > 0 ? `${avgRating.toFixed(1)} / 5.0 (${totalReviews} reviews)` : "No reviews yet"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k}</span>
                        <span className="text-sm text-gray-800 capitalize font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tab === "shipping" && (
                  <div className="space-y-4">
                    {[
                      { icon: <Truck size={15} className="text-pink-500" />,    title: "Standard Delivery Included", sub: `Included in price. Arrives in ${standardDeliveryWindow} business days.` },
                      { icon: <Package size={15} className="text-pink-500" />,  title: "Express Delivery - Extra at checkout", sub: `Express price is calculated from courier rates using your pincode and payment method. Typical delivery: ${expressDeliveryWindow} business days.` },
                      { icon: <RotateCcw size={15} className="text-pink-500" />, title: `Easy ${returnDays}-Day Returns`, sub: "Not satisfied? Return within the window for a full refund." },
                    ].map(s => (
                      <div key={s.title} className="flex gap-3">
                        <div className="mt-0.5 shrink-0">{s.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Perks */}
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { icon: <Award size={13} />,       text: "Genuine Product" },
                { icon: <CheckCircle size={13} />, text: "Quality Assured" },
                { icon: <Shield size={13} />,      text: "Secure Checkout" },
              ].map(p => (
                <div key={p.text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="text-pink-400">{p.icon}</span> {p.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">You Might Also Like</h2>
              <p className="text-sm text-gray-500">More from {product.category}</p>
            </div>
            {similarProducts.length > 8 && (
              <button onClick={() => router.push(`/category/${product.category}`)}
                className="text-sm font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1">
                View all <ChevronRight size={15} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {similarProducts.slice(0, 10).map((p) => (
              <SimilarProductCard key={p.id} product={p} onClick={() => router.push(`/products/${p.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div id="reviews-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalReviews > 0
                  ? `${totalReviews} verified review${totalReviews !== 1 ? "s" : ""}`
                  : sessionStatus === "authenticated" ? "Be the first to review!" : "Login to write a review"}
              </p>
            </div>
            {sessionStatus === "loading" || reviewsLoading ? null
            : sessionStatus === "authenticated" && userReview ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
                <CheckCircle size={15} className="text-amber-500" /> You&apos;ve reviewed this product
              </div>
            ) : sessionStatus === "authenticated" ? (
              <button onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 transition shadow-md shadow-pink-100">
                <Camera size={15} /> Write a Review
              </button>
            ) : (
              <button onClick={() => router.push("/login")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition shadow-md">
                Login to Review
              </button>
            )}
          </div>

          {totalReviews > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 sm:p-8 border-b border-gray-100">
              <div className="flex items-center gap-6">
                <div className="text-center shrink-0">
                  <div className="text-6xl font-black text-gray-900">{avgRating.toFixed(1)}</div>
                  <StarRow rating={avgRating} size={18} />
                  <p className="text-xs text-gray-400 mt-1">{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</p>
                </div>
                <div className="flex-1 space-y-2">
                  {metricBreakdown.map(m => (
                    <div key={m.key} className="w-full flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{m.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${m.percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-8 text-right shrink-0">
                        {m.avg !== null ? m.avg.toFixed(1) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-pink-400" />
              </div>
            ) : reviewsError ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <p className="text-sm text-red-500 font-medium">{reviewsError}</p>
               <button
  onClick={() => {
    if (product?.category && product?.id) {
      loadSimilarProducts(product.category, product.id)
    }
  }}
  className="text-xs text-pink-600 underline hover:text-pink-700"
>
  Try again
</button>
              </div>
            ) : paginatedReviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedReviews.map(r => (
                  <ReviewCard key={r.id} review={r} onVote={handleVote}
                    isLoggedIn={sessionStatus === "authenticated"} myVote={r.myVote ?? null}
                    onEdit={r.isOwner ? (action) => {
                      if (action === "delete") setShowDeleteConfirm(true)
                      else setShowReviewModal(true)
                    } : undefined} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500 mb-1">No reviews yet</p>
                {session ? (
                  <>
                    <p className="text-xs text-gray-400 mb-4">Be the first to share your experience!</p>
                    <button onClick={() => setShowReviewModal(true)}
                      className="px-5 py-2 bg-pink-600 text-white text-sm font-semibold rounded-xl hover:bg-pink-700 transition">
                      Write a Review
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-4">Login to share your experience!</p>
                    <button onClick={() => router.push("/login")}
                      className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition">
                      Login to Review
                    </button>
                  </>
                )}
              </div>
            )}

            {hasMoreReviews && (
              <div className="mt-6 text-center">
                <button onClick={() => setReviewPage(p => p + 1)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Load More Reviews <ChevronDown size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA (mobile) */}
      {pinned && (product.stock ?? 0) > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-gray-500 font-medium">Quantity</span>
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => { if (isInCart) toggleCart(product, -1); else setQuantity(q => Math.max(1, q - 1)) }}
                className="px-3 py-1.5 hover:bg-gray-50 transition text-gray-500">
                <Minus size={12} />
              </button>
              <span className="px-4 py-1.5 text-sm font-bold text-gray-800 border-x border-gray-200 min-w-9 text-center">
                {isInCart ? cartQty : quantity}
              </span>
              <button
                onClick={() => { if (isInCart) { if (cartQty < (product.stock ?? 99)) toggleCart(product, 1) } else setQuantity(q => Math.min(product.stock ?? 99, q + 1)) }}
                disabled={(isInCart ? cartQty : quantity) >= (product.stock ?? 99)}
                className="px-3 py-1.5 hover:bg-gray-50 transition text-gray-500 disabled:opacity-30">
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { if (isInCart) router.push("/cart"); else toggleCart(product, quantity) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${
                isInCart ? "bg-emerald-600 text-white" : "bg-gray-900 text-white"
              }`}>
              {isInCart ? <ArrowRight size={16} /> : <ShoppingCart size={16} />}
              {isInCart ? `Go to Cart (${cartQty})` : "Add to Cart"}
            </button>
            <button
              disabled={(product.stock ?? 0) === 0}
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-linear-to-r from-pink-600 to-rose-500 text-white hover:from-pink-700 hover:to-rose-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
              Buy Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}