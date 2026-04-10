"use client"

import { FormEvent, useMemo, useState } from "react"
import Image from "next/image"
import { formatINR } from "@/lib/money"
import { splitHandlingCharge } from "@/lib/pricing"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MapPin,
  Package,
  ReceiptIndianRupee,
  Search,
  Truck,
} from "lucide-react"

type TrackOrder = {
  orderNumber: string
  status: string
  deliveryStatus?: string
  deliveryTier?: string
  paymentStatus: string
  paymentMethod: string
  totalAmount: number
  subtotal?: number
  discount?: number
  shipping?: number
  pricingDisplay?: {
    standardIncludedDeliveryCharge: number
    subtotal: number
    discount: number
    total: number
  }
  createdAt: string
  estimatedDelivery: string | null
  trackingId?: string | null
  items: Array<{
    title: string
    quantity: number
    price: number
    image: string | null
    displayLineTotal?: number
  }>
  shippingAddress: {
    city: string
    state: string
    pincode: string
    phone: string | null
  } | null
}

type UiOrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"

const TRACK_STEPS: { key: UiOrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Order Placed", icon: <Clock size={16} /> },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle2 size={16} /> },
  { key: "shipped", label: "Shipped", icon: <Package size={16} /> },
  { key: "out_for_delivery", label: "Out for Delivery", icon: <Truck size={16} /> },
  { key: "delivered", label: "Delivered", icon: <Home size={16} /> },
]

const STATUS_META: Record<UiOrderStatus, { label: string; step: number; badge: string }> = {
  pending: { label: "Order Placed", step: 0, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", step: 1, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  shipped: { label: "Shipped", step: 2, badge: "bg-violet-50 text-violet-700 border-violet-200" },
  out_for_delivery: { label: "Out for Delivery", step: 3, badge: "bg-orange-50 text-orange-700 border-orange-200" },
  delivered: { label: "Delivered", step: 4, badge: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", step: -1, badge: "bg-red-50 text-red-700 border-red-200" },
}

function normalizeOrderStatus(order: TrackOrder): UiOrderStatus {
  const status = (order.status || "").toUpperCase()
  const delivery = (order.deliveryStatus || "").toUpperCase()

  if (status === "CANCELLED" || status === "FAILED") return "cancelled"
  if (delivery === "DELIVERED") return "delivered"
  if (delivery === "OUT_FOR_DELIVERY") return "out_for_delivery"
  if (delivery === "SHIPPED") return "shipped"
  if (status === "SHIPPED") return "shipped"
  if (status === "DELIVERED") return "delivered"
  if (status === "PAID" || status === "CONFIRMED") return "confirmed"

  return "pending"
}

function getDisplayPricing(order: TrackOrder) {
  const displaySubtotal = Math.max(0, Math.round(order.pricingDisplay?.subtotal ?? order.subtotal ?? 0))
  const displayDiscount = Math.max(0, Math.round(order.pricingDisplay?.discount ?? order.discount ?? 0))
  const fallbackTotal = Math.max(displaySubtotal - displayDiscount, 0)
  const displayTotal = Math.max(0, Math.round(order.pricingDisplay?.total ?? order.totalAmount ?? fallbackTotal))

  return { displaySubtotal, displayDiscount, displayTotal }
}

function getDisplayLineTotal(order: TrackOrder, item: TrackOrder["items"][number]): number {
  const baseSubtotal = (order.subtotal ?? 0) > 0
    ? (order.subtotal as number)
    : (order.items || []).reduce(
        (sum, orderItem) => sum + Math.max(0, (orderItem.price || 0) * (orderItem.quantity || 0)),
        0
      )

  const baseLineTotal = Math.max(0, (item.price || 0) * (item.quantity || 0))
  if (baseSubtotal <= 0) return baseLineTotal

  const { displayTotal } = getDisplayPricing(order)
  const ratio = baseLineTotal / baseSubtotal

  return Math.round(displayTotal * ratio)
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<TrackOrder | null>(null)

  const normalizedStatus = useMemo(() => {
    if (!order) return "pending" as UiOrderStatus
    return normalizeOrderStatus(order)
  }, [order])

  const currentStep = useMemo(() => {
    if (!order) return -1
    return STATUS_META[normalizedStatus].step
  }, [order, normalizedStatus])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    if (!orderNumber.trim()) {
      setError("Please enter an order number.")
      return
    }

    setIsLoading(true)
    setError(null)
    setOrder(null)

    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Unable to track this order.")
        return
      }

      setOrder(data.order)
    } catch {
      setError("Something went wrong while fetching order details.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">Track Your Order</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Enter your order number to check live status, payment details, and delivery information.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g., ORD-1712560012345)"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track Order
            </button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
        {!order && !isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
            Enter your order number above to view tracking details.
          </div>
        )}

        {order && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Order Number</p>
                  <p className="text-lg font-black text-slate-900">{order.orderNumber}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${STATUS_META[normalizedStatus].badge}`}>
                  {STATUS_META[normalizedStatus].label}
                </span>
              </div>

              {normalizedStatus === "cancelled" ? (
                <p className="mt-4 text-sm text-red-600 font-medium">This order has been cancelled.</p>
              ) : (
                <div className="mt-5 relative">
                  <div className="absolute left-5.5 top-5 bottom-5 w-0.5 bg-gray-100 z-0" />
                  <div className="space-y-1">
                    {TRACK_STEPS.map((step, idx) => {
                      const done = idx < currentStep
                      const active = idx === currentStep

                      return (
                        <div key={step.key} className="relative flex items-start gap-4 z-10">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                            done
                              ? "bg-pink-600 border-pink-600 text-white"
                              : active
                                ? "bg-gray-900 border-gray-900 text-white ring-4 ring-gray-100"
                                : "bg-white border-gray-200 text-gray-300"
                          }`}>
                            {done ? <CheckCircle2 size={16} strokeWidth={2.5} /> : step.icon}
                          </div>

                          <div className="flex-1 py-2.5">
                            <p className={`text-sm font-bold ${active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-300"}`}>
                              {step.label}
                            </p>
                            {active && (
                              <p className="text-xs text-pink-600 font-medium mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block animate-pulse" />
                                Current status
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {normalizedStatus === "cancelled" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                Order cancelled. If payment was captured, refund will be processed as per policy.
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Payment</h2>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {(() => {
                    const { displayTotal } = getDisplayPricing(order)
                    return (
                      <p className="flex items-center gap-2"><ReceiptIndianRupee className="w-4 h-4 text-slate-500" /> Total: {formatINR(displayTotal)}</p>
                    )
                  })()}
                  <p>Method: {order.paymentMethod}</p>
                  <p>Status: {order.paymentStatus}</p>
                  <p>Placed On: {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                  <p>Estimated Delivery: {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN") : "To be confirmed"}</p>
                  {order.deliveryTier && (
                    <p className="font-semibold text-slate-800">
                      Delivery Tier: {order.deliveryTier}
                      {(order.deliveryTier || "").toUpperCase() === "STANDARD" && (
                        <span className="text-green-600 text-xs ml-1">✓ Free </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Delivery Address</h2>
                {order.shippingAddress ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500" /> {order.shippingAddress.city}, {order.shippingAddress.state}</p>
                    <p>Pincode: {order.shippingAddress.pincode}</p>
                    <p>Phone: {order.shippingAddress.phone || "Not available"}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Address details are not available.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Ordered Items</h2>
              <div className="mt-4 space-y-3">
                {order.items.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-2"><Package className="w-4 h-4 text-slate-500" /> {item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {formatINR(item.displayLineTotal ?? getDisplayLineTotal(order, item))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-700 space-y-1">
                {(() => {
                  const { displaySubtotal, displayDiscount, displayTotal } = getDisplayPricing(order)
                  const shippingCharge = Math.max(0, Math.round(order.shipping ?? 0))
                  const handlingBreakdown = splitHandlingCharge(shippingCharge)
                  const isStandardDelivery = (order.deliveryTier || "").toUpperCase() === "STANDARD"
                  const isCodPayment = (order.paymentMethod || "").toUpperCase() === "COD"
                  return (
                    <>
                      <p>Subtotal: {formatINR(displaySubtotal)}</p>
                      <p>Discount: {formatINR(displayDiscount)}</p>
                      {isStandardDelivery && shippingCharge > 0 && (
                        <>
                          <p>Packaging Charges{isCodPayment ? " (COD 60%)" : ""}: {formatINR(handlingBreakdown.packagingCharge)}</p>
                          <p>Handling Fee{isCodPayment ? " (COD 40%)" : ""}: {formatINR(handlingBreakdown.handlingFee)}</p>
                        </>
                      )}
                      <p className="font-bold text-slate-900">Total Paid: {formatINR(displayTotal)}</p>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
