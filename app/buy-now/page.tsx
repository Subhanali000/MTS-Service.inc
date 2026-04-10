"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, MapPin, ShieldCheck, Package, Zap } from "lucide-react"
import { parseEtd, formatDateRange } from "@/lib/shiprocket"
import { getCatalogEffectivePrice, getCatalogOriginalEffectivePrice, getCodHandlingCharge, getStandardIncludedDeliveryCharge, getHandlingChargeForStandard, getExpressChargeAfterStandard, splitHandlingCharge } from "@/lib/pricing"

type Product = {
  id: string
  title: string
  price: number
  finalPrice?: number
  weight?: number
  stock?: number
  images?: string[]
  category?: string
}

type PaymentMethod = "ONLINE" | "COD"
type ShippingTier = "STANDARD" | "EXPRESS"

type DeliveryCourier = {
  courier_company_id: number
  courier_name: string
  rate: number
  estimated_delivery?: string | null
}

type TopRate = {
  courier: string
  rate: number
  etd?: string | null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone: string): boolean {
  return /^[0-9]{10}$/.test(phone)
}

function isValidPincode(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

function getDeliveryLabel(courier: DeliveryCourier | null): string {
  if (!courier?.estimated_delivery) return ""
  const etd = parseEtd(courier.estimated_delivery)
  if (!etd) return ""
  return formatDateRange(etd.from, etd.to)
}

function getExpectedDeliveryFallback(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + Math.max(0, daysFromNow))
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric
}

function getLowestRate(rates: TopRate[] | null | undefined): number | null {
  if (!Array.isArray(rates) || rates.length === 0) return null
  const numericRates = rates.map(rate => toPositiveNumber(rate.rate)).filter(rate => rate > 0)
  if (!numericRates.length) return null
  return Math.min(...numericRates)
}

function getProductWeightKg(product: Product | null): number {
  if (!product) {
    throw new Error("Product is required for weight calculation")
  }
  const weight = toPositiveNumber((product as any)?.weight)
  if (weight <= 0) {
    throw new Error(
      `Product "${product.title}" is missing a valid weight. Weight is mandatory for shipping calculations.`
    )
  }
  return weight
}

function BuyNowContent() {
  const STANDARD_INCLUDED_DELIVERY_CHARGE = getStandardIncludedDeliveryCharge()
  const router = useRouter()
  const params = useSearchParams()

  const productId = params.get("productId") || ""
  const qtyParam = Number(params.get("qty") || "1")
  const quantity = Number.isFinite(qtyParam) ? Math.max(1, qtyParam) : 1

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState("")
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState<"unavailable" | "error" | null>(null)
  const [standardCourier, setStandardCourier] = useState<DeliveryCourier | null>(null)
  const [expressCourier, setExpressCourier] = useState<DeliveryCourier | null>(null)
  const [lowestStandardRate, setLowestStandardRate] = useState<number | null>(null)
  const [lowestExpressRate, setLowestExpressRate] = useState<number | null>(null)
  const [lowestCodRate, setLowestCodRate] = useState<number | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE")
  const [shippingTier, setShippingTier] = useState<ShippingTier>("STANDARD")

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  })

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      if (!productId) {
        setError("Missing product details. Please go back and try again.")
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/products/${productId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Failed to load product")
        if (!cancelled) setProduct(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load product")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProduct()
    return () => {
      cancelled = true
    }
  }, [productId])

  useEffect(() => {
    const pin = form.pincode.trim()
    if (!/^\d{6}$/.test(pin)) {
      setStandardCourier(null)
      setExpressCourier(null)
      setLowestStandardRate(null)
      setLowestExpressRate(null)
      setLowestCodRate(null)
      setDeliveryError(null)
      return
    }

    const controller = new AbortController()
    ;(async () => {
      setDeliveryLoading(true)
      setDeliveryError(null)
      setStandardCourier(null)
      setExpressCourier(null)
      setLowestStandardRate(null)
      setLowestExpressRate(null)
      setLowestCodRate(null)
      try {
        const isCod = paymentMethod === "COD"
        const totalWeightKg = Math.max(0.5, getProductWeightKg(product) * quantity)
        const res = await fetch(`/api/delivery/serviceability?pincode=${pin}&cod=${isCod}&weight=${encodeURIComponent(totalWeightKg.toFixed(3))}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        if (!res.ok || !data?.available) {
          setDeliveryError("unavailable")
          setStandardCourier(null)
          setExpressCourier(null)
          setLowestStandardRate(null)
          setLowestExpressRate(null)
          setLowestCodRate(null)
          return
        }

        const flat: DeliveryCourier[] = data.available_courier_companies
          ?? [...(data.express ?? []), ...(data.standard ?? [])]

        const standardTopRates = (data.standardTopRates ?? []) as TopRate[]
        const expressTopRates = (data.expressTopRates ?? []) as TopRate[]
        const codTopRates = (isCod ? standardTopRates : (data.codPreview?.topRates ?? [])) as TopRate[]
        const standardAmount = Number(data.standardAmount ?? data.lowestStandardRate ?? data.lowestExpressRate ?? 0)
        const expressAmount = Number(data.expressAmount ?? data.lowestExpressRate ?? 0)
        const codAmount = Number(data.lowestCodRate ?? data.codRate ?? getLowestRate(codTopRates) ?? 0)

        setLowestStandardRate(Number.isFinite(standardAmount) ? standardAmount : null)
        setLowestExpressRate(Number.isFinite(expressAmount) ? expressAmount : null)
        setLowestCodRate(Number.isFinite(codAmount) ? codAmount : null)

        console.log({
          standardRate: Number.isFinite(standardAmount) ? standardAmount : 0,
          expressRate: Number.isFinite(expressAmount) ? expressAmount : 0,
          codRate: Number.isFinite(codAmount) ? codAmount : 0,
          standardHandling: Math.max((Number.isFinite(standardAmount) ? standardAmount : 0) - STANDARD_INCLUDED_DELIVERY_CHARGE, 0),
          expressCharge: Math.max((Number.isFinite(expressAmount) ? expressAmount : 0) - STANDARD_INCLUDED_DELIVERY_CHARGE, 0),
          codHandling: Math.max((Number.isFinite(codAmount) ? codAmount : 0) - STANDARD_INCLUDED_DELIVERY_CHARGE, 0),
        })

        if (!flat.length) {
          setDeliveryError("unavailable")
          setStandardCourier(null)
          setExpressCourier(null)
          setLowestStandardRate(null)
          setLowestExpressRate(null)
          setLowestCodRate(null)
          return
        }

        const std = flat.reduce((a, b) => (Number(a.rate || 0) <= Number(b.rate || 0) ? a : b))
        const fastest = flat.reduce((a, b) => {
          const aEtd = typeof a.estimated_delivery === "string" ? a.estimated_delivery : undefined
          const bEtd = typeof b.estimated_delivery === "string" ? b.estimated_delivery : undefined
          const aTime = aEtd ? (parseEtd(aEtd)?.from?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
          const bTime = bEtd ? (parseEtd(bEtd)?.from?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
          return aTime <= bTime ? a : b
        })

        let exp = fastest
        if (fastest.courier_company_id === std.courier_company_id) {
          const fallbackExpress = flat
            .filter(c => c.courier_company_id !== std.courier_company_id)
            .sort((a, b) => {
              const aEtd = typeof a.estimated_delivery === "string" ? a.estimated_delivery : undefined
              const bEtd = typeof b.estimated_delivery === "string" ? b.estimated_delivery : undefined
              const aTime = aEtd ? (parseEtd(aEtd)?.from?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
              const bTime = bEtd ? (parseEtd(bEtd)?.from?.getTime() ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
              return aTime - bTime
            })[0]
          if (fallbackExpress) exp = fallbackExpress
        }

        setStandardCourier(std)
        setExpressCourier(exp)
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setDeliveryError("error")
          setStandardCourier(null)
          setExpressCourier(null)
          setLowestStandardRate(null)
          setLowestExpressRate(null)
          setLowestCodRate(null)
        }
      } finally {
        setDeliveryLoading(false)
      }
    })()

    return () => controller.abort()
  }, [form.pincode, paymentMethod, product, quantity])

  const unitPrice = useMemo(() => {
    if (!product) return 0
    return getCatalogEffectivePrice(product)
  }, [product])

  const originalUnitPrice = product ? (getCatalogOriginalEffectivePrice(product) ?? unitPrice) : 0
  const mrpTotal = originalUnitPrice * quantity
  const discountedRateTotal = unitPrice * quantity
  const displayedSubtotal = unitPrice * quantity
  const itemDiscount = Math.max(0, (originalUnitPrice - unitPrice) * quantity)
  const standardIncludedDeliveryCharge = STANDARD_INCLUDED_DELIVERY_CHARGE
  const standardRate = Math.max(0, Math.round(lowestStandardRate ?? lowestExpressRate ?? STANDARD_INCLUDED_DELIVERY_CHARGE))
  const expressRate = Math.max(0, Math.round(lowestExpressRate ?? standardRate))
  const codRate = Math.max(0, Math.round(lowestCodRate ?? standardRate))
  const standardCourierRate = standardCourier ? Math.max(0, Math.round(standardCourier.rate)) : standardRate
  const expressCourierRate = expressCourier ? Math.max(0, Math.round(expressCourier.rate)) : expressRate
  
  // ─── Weight-based calculation using included delivery base (default ₹499) ──────────────────
  const standardHandlingCharge = getHandlingChargeForStandard(standardCourierRate)
  const expressAdditionalDeliveryCharge = getExpressChargeAfterStandard(expressCourierRate)
  const shipping = shippingTier === "EXPRESS" ? expressAdditionalDeliveryCharge : standardHandlingCharge
  const codHandlingCharge = paymentMethod === "COD"
    ? getCodHandlingCharge(standardIncludedDeliveryCharge, Math.max(0, Math.round(codRate)))
    : 0
  const standardHandlingBreakdown = splitHandlingCharge(standardHandlingCharge)
  const codHandlingBreakdown = splitHandlingCharge(codHandlingCharge)
  const hasValidPincode = isValidPincode(form.pincode.trim())
  const hasFetchedDeliveryRates =
    standardCourier !== null ||
    expressCourier !== null ||
    lowestStandardRate !== null ||
    lowestExpressRate !== null
  const deliveryReady = hasValidPincode && !deliveryLoading && deliveryError === null && hasFetchedDeliveryRates
  const total = Math.max(0, displayedSubtotal + codHandlingCharge + shipping)
  const standardDeliveryLabel = getDeliveryLabel(standardCourier)
  const expressDeliveryLabel = getDeliveryLabel(expressCourier)

  const setField = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validate = (): string | null => {
    if (!product) return "Product not available"
    if ((product.stock ?? 0) < 1) return "This product is out of stock"

    if (!form.name.trim()) return "Name is required"
    if (!isValidEmail(form.email.trim())) return "Enter a valid email"
    if (!isValidPhone(form.phone.trim())) return "Enter a valid 10-digit phone number"
    if (!form.line1.trim()) return "Address line 1 is required"
    if (!form.city.trim()) return "City is required"
    if (!form.state.trim()) return "State is required"
    if (!isValidPincode(form.pincode.trim())) return "Enter a valid 6-digit pincode"
    return null
  }

  const handlePlaceOrder = async () => {
    if (!hasValidPincode) {
      setError("Enter a valid 6-digit pincode to fetch delivery charges")
      return
    }

    if (deliveryLoading || !deliveryReady) {
      setError("Please wait while delivery charges are being fetched")
      return
    }

    if (deliveryError === "unavailable") {
      setError("Delivery is unavailable for this pincode")
      return
    }

    if (deliveryError === "error") {
      setError("Could not fetch delivery charges. Please try again")
      return
    }

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!product) return

    setError("")
    setPlacing(true)

    try {
      const payload = {
        items: [
          {
            productId: product.id,
            quantity,
            title: product.title,
            price: unitPrice,
            weight: getProductWeightKg(product),
          },
        ],
        address: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          type: "home",
        },
        couponCode: null,
        giftWrap: false,
        giftMessage: "",
        guestEmail: form.email.trim().toLowerCase(),
        guestName: form.name.trim(),
        guestPhone: form.phone.trim(),
        deliveryTier: shippingTier.toUpperCase(),
        paymentMethod,
      }

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      let data: any = null
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error("Server returned an invalid response")
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order")
      }

      // For ONLINE payment, redirect to payment page
      // For COD, redirect to orders page
      if (paymentMethod === "ONLINE") {
        const total = Number(data?.summary?.total ?? 0)
        const currency = encodeURIComponent(data?.currency ?? "INR")
        const keyId = encodeURIComponent(data?.keyId ?? "")
        const mock = data?.isMockPayment ? "1" : "0"
        router.push(`/payment?orderId=${data.orderId}&dbOrderId=${data.dbOrderId}&total=${Math.round(total)}&currency=${currency}&keyId=${keyId}&mock=${mock}`)
        return
      }

      router.push("/orders")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-500" size={28} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center px-4">
        <div className="bg-white border border-rose-100 rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-gray-700 mb-4">{error || "Product not found"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-rose-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f6] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-rose-600 transition"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> Secure checkout
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Buy Now</h1>
            <p className="text-sm text-gray-500 mt-1">Complete your order in one step, no login required.</p>

            <div className="mt-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={16} className="text-rose-500" /> Delivery Details
              </h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <input className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="Full name" value={form.name} onChange={e => setField("name", e.target.value)} />
                <input className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="Email" value={form.email} onChange={e => setField("email", e.target.value)} />
                <input
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={e => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
                <input
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={e => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              <input className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="Address line 1" value={form.line1} onChange={e => setField("line1", e.target.value)} />
              <input className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="Address line 2 (optional)" value={form.line2} onChange={e => setField("line2", e.target.value)} />

              <div className="grid sm:grid-cols-2 gap-3">
                <input className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="City" value={form.city} onChange={e => setField("city", e.target.value)} />
                <input className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="State" value={form.state} onChange={e => setField("state", e.target.value)} />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard size={16} className="text-rose-500" /> Payment Method
              </h2>

              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${paymentMethod === "ONLINE" ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="paymentMethod" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Online Payment</p>
                    <p className="text-xs text-gray-500">UPI, Cards, Net Banking</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">Recommended</span>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${paymentMethod === "COD" ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="paymentMethod" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                </div>
              </label>
            </div>

          

            <div className="mt-6 space-y-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-rose-500" /> Shipping Type
              </h2>

              {["STANDARD", "EXPRESS"].map((tier) => {
                const active = shippingTier === tier
                const isStandard = tier === "STANDARD"
                const displayPrice = isStandard ? standardHandlingCharge : expressAdditionalDeliveryCharge
                const description = isStandard
                  ? standardHandlingCharge > 0 
                    ? "Handling fee applies"
                    : `FREE Delivery.`
                  : displayPrice === 0
                    ? "FREE Express."
                    : "Express surcharge applies"
                const descriptionClass = !isStandard && displayPrice === 0
                  ? "text-xs text-green-600 mt-1 font-semibold"
                  : "text-xs text-green-500 mt-1 font-semibold"
                const etaLabel = (isStandard ? standardDeliveryLabel : expressDeliveryLabel)
                  || getExpectedDeliveryFallback(isStandard ? 3 : 1)

                return (
                  <label
                    key={tier}
                    className={`block p-3 rounded-xl border cursor-pointer transition ${active ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="shippingTier"
                        checked={active}
                        onChange={() => setShippingTier(tier as ShippingTier)}
                        className="mt-1"
                      />
                     <div className="min-w-0 flex-1">
  <div className="flex items-center justify-between gap-3">
    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
      {!isStandard && <Zap size={14} className="text-amber-500" />}
      {isStandard ? "Standard" : "Express"}
    </p>
  </div>

  {/* Description */}
  <p className={descriptionClass}>{description}</p>

  {/* ETA */}
  <p className="text-[11px] text-gray-500 mt-1">
    Estimated delivery:{" "}
    <span className="font-semibold text-gray-700">{etaLabel}</span>
  </p>
</div>
                    </div>
                  </label>
                )
              })}

              {deliveryLoading && (
                <p className="text-xs text-gray-400">Checking live delivery rates...</p>
              )}
              {deliveryError === "unavailable" && (
                <p className="text-xs text-amber-600">Delivery may be unavailable for this pincode. Showing default charges.</p>
              )}
            </div>

            {error && (
              <div className="mt-5 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}
          </section>

          <aside className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm h-fit sticky top-6">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

            <div className="mt-4 flex gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-100">
                <Image src={product.images?.[0] || "/images/No_Image_Available.jpg"} alt={product.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{product.title}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{product.category || "Product"}</p>
                <p className="text-xs text-gray-500 mt-1">Qty: {quantity}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-gray-600 gap-4">
                <span>MRP</span>
                <span className="min-w-24 text-right tabular-nums">{formatAmount(mrpTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600 gap-4">
                <span>Discounted Rate</span>
                <span className="min-w-24 text-right tabular-nums">-{formatAmount(itemDiscount)}</span>
              </div>

             

              <div className="flex items-center justify-between text-gray-600 gap-4">
                <span>Price Total (Inclusive of all taxes)</span>
                <span className="min-w-24 text-right tabular-nums font-semibold text-gray-900">{formatAmount(displayedSubtotal)}</span>
              </div>

              {shippingTier === "EXPRESS" ? (
                <div className="flex items-center justify-between text-gray-600 gap-4">
                  <span className="flex flex-col items-start">
                    <span>Delivery Charges (Express)</span>
                    {expressDeliveryLabel && <span className="text-[11px] text-gray-400">{expressDeliveryLabel}</span>}
                  </span>
                  {shipping === 0 ? (
                    <span className="min-w-24 flex items-center justify-end gap-1 text-green-600 font-semibold">
                      <Zap size={14} className="text-amber-500" />
                      FREE
                    </span>
                  ) : (
                    <span className="min-w-24 text-right tabular-nums">+{formatAmount(shipping)}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-gray-600 gap-4">
                  <span className="flex flex-col items-start">
                    <span>Delivery Charges (Standard)</span>
                    {standardDeliveryLabel && <span className="text-[11px] text-gray-400">{standardDeliveryLabel}</span>}
                  </span>
                  <span className="min-w-24 flex items-center justify-end gap-1 text-green-600 font-semibold">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M3 3h13v13H3z" />
    <path d="M16 8h4l1 3v5h-5z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="17.5" cy="18.5" r="1.5" />
  </svg>
  FREE
</span>
                </div>
              )}
              {shippingTier === "STANDARD" && standardHandlingCharge > 0 && (
                <>
                  <div className="flex items-center justify-between text-gray-600 gap-4">
                    <span>Packaging Charges (60%)</span>
                    <span className="min-w-24 text-right tabular-nums">{formatAmount(standardHandlingBreakdown.packagingCharge)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 gap-4">
                    <span>Handling Fee (40%)</span>
                    <span className="min-w-24 text-right tabular-nums">{formatAmount(standardHandlingBreakdown.handlingFee)}</span>
                  </div>
                </>
              )}
              {paymentMethod === "COD" && codHandlingCharge > 0 && (
                <>
                  <div className="flex items-center justify-between text-gray-600 gap-4">
                    <span>Packaging Charges (COD 60%)</span>
                    <span className="min-w-24 text-right tabular-nums">{formatAmount(codHandlingBreakdown.packagingCharge)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 gap-4">
                    <span>Handling Fee (COD 40%)</span>
                    <span className="min-w-24 text-right tabular-nums">{formatAmount(codHandlingBreakdown.handlingFee)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between font-bold text-gray-900 gap-4">
                <span>Total</span>
                <span className="min-w-24 text-right tabular-nums text-base">{formatAmount(total)}</span>
              </div>
            </div>

            {/* Savings Message */}
            {itemDiscount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-700 font-medium">
                  You're saving {formatAmount(itemDiscount)} on this order!
                </p>
              </div>
            )}
            <button
              onClick={handlePlaceOrder}
              disabled={
                placing ||
                (product.stock ?? 0) < 1 ||
                !hasValidPincode ||
                deliveryLoading ||
                !deliveryReady ||
                deliveryError !== null
              }
              className="mt-5 w-full py-3.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white font-bold hover:from-rose-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placing && <Loader2 size={16} className="animate-spin" />}
              {placing
                ? "Creating Order..."
                : !hasValidPincode
                  ? "Enter pincode to fetch delivery"
                  : deliveryLoading
                    ? "Fetching delivery charges..."
                    : deliveryError === "unavailable"
                      ? "Delivery not available"
                      : deliveryError === "error"
                        ? "Could not load delivery"
                        : paymentMethod === "ONLINE"
                          ? "Pay & Place Order"
                          : "Place COD Order"}
            </button>

            <p className="mt-3 text-[11px] text-gray-500 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Your order is protected with secure payment verification.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function BuyNowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf8f6] flex items-center justify-center" />}>
      <BuyNowContent />
    </Suspense>
  )
}
