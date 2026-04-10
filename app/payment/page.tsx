"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

declare global {
  interface Window {
    Razorpay: any
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

type OrderItem = {
  productId: string
  title: string
  quantity: number
  originalPrice: number
  finalPrice: number
  discountPercent: number
  discountAmount: number
  originalDisplayPrice: number
  finalDisplayPrice: number
  lineOriginalTotal: number
  lineFinalTotal: number
  lineDiscountTotal: number
}

type OrderDetails = {
  id: string
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  giftWrap: number
  totalAmount: number
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function PaymentContent() {
  const params = useSearchParams()
  const router = useRouter()

  const orderId = params.get("orderId")
  const dbOrderId = params.get("dbOrderId")
  const totalParam = params.get("total")
  const currencyParam = params.get("currency") || "INR"
  const keyFromQuery = params.get("keyId") || ""
  const mockFromQuery = params.get("mock") === "1"

  const [isReady, setIsReady] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)

  const queryTotalAmount = useMemo(() => {
    const parsed = Number(totalParam ?? 0)
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
  }, [totalParam])

  const totalAmount = Math.round(orderDetails?.totalAmount ?? queryTotalAmount)

  const payableLabel = useMemo(() => formatAmount(totalAmount, currencyParam), [totalAmount, currencyParam])

  const razorpayKey = keyFromQuery || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
  const isMockMode = mockFromQuery || !razorpayKey || (orderId?.startsWith("order_mock_") ?? false)

  // Fetch order details for breakdown display
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!dbOrderId) {
        setLoadingOrder(false)
        return
      }

      try {
        const orderIdParam = encodeURIComponent(orderId || "")
        const res = await fetch(`/api/orders/details/${dbOrderId}?orderId=${orderIdParam}`)
        if (res.ok) {
          const data = await res.json()
          if (data.order) {
            const order = data.order
            setOrderDetails({
              id: order.id,
              items: order.items || [],
              subtotal: order.subtotal || 0,
              discount: order.discount || 0,
              shipping: order.shipping || 0,
              giftWrap: order.giftWrap || 0,
              totalAmount: order.totalAmount || totalAmount,
            })
          }
        }
      } catch (err) {
        console.error("Failed to fetch order details:", err)
      } finally {
        setLoadingOrder(false)
      }
    }

    fetchOrderDetails()
  }, [dbOrderId, totalAmount, orderId])

  useEffect(() => {
    const init = async () => {
      if (!orderId || !dbOrderId) {
        setError("Missing payment details. Please retry checkout.")
        return
      }

      if (isMockMode) {
        setIsReady(true)
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setError("Unable to load payment gateway. Please refresh and try again.")
        return
      }

      if (!razorpayKey) {
        setError("Payment configuration missing. Please contact support.")
        return
      }

      setIsReady(true)
    }

    init()
  }, [orderId, dbOrderId, razorpayKey, isMockMode])

  const handlePayNow = async () => {
    if (!orderId || !dbOrderId) {
      setError("Missing payment details. Please retry checkout.")
      return
    }

    setError("")
    setSuccessMessage("")
    setIsPaying(true)

    try {
      if (isMockMode) {
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: `test_payment_${Date.now()}`,
            razorpay_signature: "test_signature",
            dbOrderId,
          }),
        })

        const verifyJson = await verifyRes.json().catch(() => ({}))
        if (!verifyRes.ok) {
          setError(verifyJson?.error || "Mock payment verification failed")
          setIsPaying(false)
          return
        }

        // Show success dialog
        setSuccessMessage("Payment successful!")
        setShowSuccessDialog(true)
        
        // Redirect after 3 seconds
        setTimeout(() => {
          router.push("/orders")
        }, 3000)
        return
      }

      if (!window.Razorpay) {
        setError("Payment SDK not ready. Please refresh and try again.")
        setIsPaying(false)
        return
      }

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        order_id: orderId,
        name: "MTS Services",
        description: "Order Payment",
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              dbOrderId,
            }),
          })

          const verifyJson = await verifyRes.json().catch(() => ({}))

          if (!verifyRes.ok) {
            setError(verifyJson?.error || "Payment verification failed")
            setIsPaying(false)
            return
          }

          // Show success dialog
          setSuccessMessage("Payment successful!")
          setShowSuccessDialog(true)
          
          // Redirect after 3 seconds
          setTimeout(() => {
            router.push("/orders")
          }, 3000)
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false)
          },
        },
        prefill: {},
        notes: {
          dbOrderId,
        },
        theme: {
          color: "#111827",
        },
      })

      razorpay.on("payment.failed", (event: any) => {
        const reason = event?.error?.description || "Payment failed. Please try again."
        setError(reason)
        setIsPaying(false)
      })

      razorpay.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initiate payment")
      setIsPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Order Summary Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
          <h1 className="text-xl font-bold text-gray-900">Secure Payment</h1>
          <p className="mt-1 text-sm text-gray-500">Confirm and complete your payment safely.</p>

          {/* Order Breakdown */}
          {!loadingOrder && orderDetails && (
            <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
              {/* Subtotal */}
              <div className="flex justify-between items-start">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Subtotal ({orderDetails.items.length} item{orderDetails.items.length !== 1 ? 's' : ''})</p>
                </div>
                <p className="font-semibold text-gray-900">{formatAmount(orderDetails.subtotal, currencyParam)}</p>
              </div>

              {/* Item Breakdown */}
              {orderDetails.items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {orderDetails.items.map((item) => {
                    return (
                      <div key={item.productId} className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            )}
                          </div>
                          <div className="text-right ml-2 flex flex-col">
                            <p className="text-xs text-gray-500 line-through">{formatAmount(item.lineOriginalTotal, currencyParam)}</p>
                            <p className="text-sm font-medium text-gray-900">{formatAmount(item.lineFinalTotal, currencyParam)}</p>
                          </div>
                        </div>
                        {item.discountPercent > 0 && (
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-amber-600 font-medium">Discount ({Math.round(item.discountPercent)}%)</p>
                            <p className="text-xs text-amber-600 font-medium">−{formatAmount(item.lineDiscountTotal, currencyParam)}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Discount Summary */}
              {orderDetails.discount > 0 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-600">Total Discount</p>
                  <p className="font-semibold text-orange-600">−{formatAmount(orderDetails.discount, currencyParam)}</p>
                </div>
              )}

              {/* Delivery */}
              {orderDetails.shipping === 0 ? (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-600">Delivery</p>
                  <p className="font-semibold text-green-600">FREE</p>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-600">Delivery</p>
                  <p className="font-semibold text-gray-900">{formatAmount(orderDetails.shipping, currencyParam)}</p>
                </div>
              )}

              {/* Gift Wrap */}
              {orderDetails.giftWrap > 0 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-600">Gift Wrap</p>
                  <p className="font-semibold text-gray-900">{formatAmount(orderDetails.giftWrap, currencyParam)}</p>
                </div>
              )}

              {/* Savings Message */}
              {orderDetails.discount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-green-700 font-medium">
                    You're saving {formatAmount(orderDetails.discount, currencyParam)} on this order!
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <p className="text-lg font-bold text-gray-900">Total</p>
                <p className="text-2xl font-black text-gray-900">{formatAmount(totalAmount, currencyParam)}</p>
              </div>
            </div>
          )}

          {/* Payable Amount Summary */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Payable Amount</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{payableLabel}</p>
            {isMockMode && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                Mock payment mode enabled for testing.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handlePayNow}
            disabled={!isReady || isPaying || !orderId || !dbOrderId || showSuccessDialog}
            className="mt-5 w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPaying
              ? "Processing..."
              : isMockMode
                ? `Pay ${payableLabel} (Mock)`
                : `Pay ${payableLabel}`}
          </button>
        </div>

       {/* Success Dialog */}
<Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
  <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">

    {/* Top Gradient Strip */}
    <div className="h-1 bg-linear-to-r from-green-500 via-emerald-500 to-green-600" />

    <div className="p-6">
      <DialogHeader>
        <DialogTitle className="text-center text-xl font-semibold text-gray-800">
          Payment Successful
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-4">

        {/* ✅ Premium Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-linear-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center shadow-inner">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* subtle glow */}
            <div className="absolute inset-0 rounded-full bg-green-400 opacity-10 blur-xl" />
          </div>
        </div>

        {/* ✅ Text Section */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Your payment has been processed successfully!
          </p>

          <p className="text-xs text-gray-500">
            Order ID:{" "}
            <span className="font-semibold text-gray-800">
              {orderId}
            </span>
          </p>
        </div>

        {/* ✅ Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">
            Redirecting to your orders page...
          </p>
        </div>

        {/* ✅ Button */}
        <button
          onClick={() => router.push("/orders")}
          className="w-full py-2.5 rounded-xl bg-black text-white font-semibold 
                     hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          View Orders
        </button>
      </div>
    </div>
  </DialogContent>
</Dialog>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f6] flex items-center justify-center" />}>
      <PaymentContent />
    </Suspense>
  )
}