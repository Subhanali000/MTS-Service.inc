// app/api/checkout/create-order/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { razorpay } from "@/lib/razorpay"
import { generateOrderId } from "@/lib/generateOrderId"
import { generateInvoiceNumber } from "@/lib/generateInvoiceNumber"
import { sendOrderCommunications } from "@/lib/orderNotifications"
import { checkServiceability, type CourierOption } from "@/lib/shiprocket"
import { calculateShipmentWeight, getPickupLocation } from "@/lib/config"
import {
  calculateGstInclusivePrice,
  getCodHandlingCharge,
  getExpressExtraCharge,
  getStandardIncludedDeliveryCharge,
  getHandlingChargeForStandard,
  getExpressChargeAfterStandard,
  getCatalogEffectivePrice,
  getCatalogOriginalEffectivePrice,
} from "@/lib/pricing"

const DEBUG_LOGS = process.env.NODE_ENV !== "production"

function debugLog(message: string, payload?: unknown) {
  if (!DEBUG_LOGS) return
  if (payload === undefined) {
    console.log(message)
    return
  }
  console.log(message, payload)
}

function debugWarn(message: string, payload?: unknown) {
  if (!DEBUG_LOGS) return
  if (payload === undefined) {
    console.warn(message)
    return
  }
  console.warn(message, payload)
}

/**
 * Structured delivery charges breakdown debug logger
 * Shows standard, express, COD charges in easy-to-understand format
 */
function logDeliveryBreakdown(context: {
  paymentMethod: string
  deliveryTier: string
  products: any[]
  totalShipmentWeightKg: number
  calculatedSubtotal: number
  calculatedDiscount: number
  discountedItemsTotal: number
  standardIncludedDeliveryCharge: number
  prepaidBreakdown: CourierRateBreakdown | null
  codBreakdown: CourierRateBreakdown | null
  standardRate: number
  expressRate: number
  codRate: number
  expressAdditionalDeliveryCharge: number
  codHandlingCharge: number
  calculatedShipping: number
  calculatedGiftWrap: number
  calculatedTotal: number
}) {
  if (!DEBUG_LOGS) return

  const {
    paymentMethod,
    deliveryTier,
    products,
    totalShipmentWeightKg,
    calculatedSubtotal,
    calculatedDiscount,
    discountedItemsTotal,
    standardIncludedDeliveryCharge,
    prepaidBreakdown,
    codBreakdown,
    standardRate,
    expressRate,
    codRate,
    expressAdditionalDeliveryCharge,
    codHandlingCharge,
    calculatedShipping,
    calculatedGiftWrap,
    calculatedTotal,
  } = context

  console.log("\n📦 1️⃣  PRODUCT DETAILS")
  console.log("─".repeat(80))
  products.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.title}`)
    console.log(`       • Base Price: ₹${Math.round(Number(p.price || 0))}`)
    console.log(`       • Weight: ${p.weight}kg`)
  })

  console.log("\n💰 2️⃣  SUBTOTAL & DISCOUNT CALCULATION")
  console.log("─".repeat(80))
  console.log(`   Subtotal (Base Prices):           ₹${Math.round(calculatedSubtotal)}`)
  console.log(`   Discount Applied:                 -₹${Math.round(calculatedDiscount)}`)
  console.log(`   Items Total (After Discount):     ₹${Math.round(discountedItemsTotal)}`)
  console.log(`   Gift Wrap Fee:                    ₹${calculatedGiftWrap}`)

  console.log("\n🚚 3️⃣  SHIPMENT INFORMATION")
  console.log("─".repeat(80))
  console.log(`   Total Weight:                     ${totalShipmentWeightKg}kg`)
  console.log(`   Payment Method:                   ${paymentMethod}`)
  console.log(`   Delivery Tier Selected:           ${deliveryTier}`)
  console.log(`   Pickup Location:                  Based on system configuration`)

  console.log("\n📌 4️⃣  STANDARD DELIVERY CHARGES")
  console.log("─".repeat(80))
  console.log(`   Status: Standard delivery is INCLUDED in product prices ✅`)
  console.log(`   Included Charge (in catalog):     ₹${standardIncludedDeliveryCharge}`)
  console.log(`   Online Prepaid:`)
  if (prepaidBreakdown?.standardRate) {
    console.log(`     • Shiprocket Rate:              ₹${prepaidBreakdown.standardRate}`)
    console.log(`     • Couriers Available:           ${prepaidBreakdown.standardCourierOptionCount} surface couriers`)
  }
  console.log(`   Cash on Delivery (COD):`)
  if (codBreakdown?.standardRate) {
    console.log(`     • Shiprocket Rate:              ₹${codBreakdown.standardRate}`)
    console.log(`     • Couriers Available:           ${codBreakdown.standardCourierOptionCount} surface couriers`)
  }

  console.log("\n✅ 5️⃣  FINAL CHARGES FOR SELECTED TIER")
  console.log("─".repeat(80))
  console.log(`   Selected Tier: ${deliveryTier}`)
  console.log(`   Standard Rate: ₹${standardRate} | Express Rate: ₹${expressRate} | COD Rate: ₹${codRate}`)
  console.log(`   Express Surcharge: ₹${expressAdditionalDeliveryCharge}`)
  console.log(`   COD Handling Charge: ₹${codHandlingCharge}`)
  console.log(`   Applied Shipping Charge: ₹${calculatedShipping}`)

  console.log("\n💳 6️⃣  PAYMENT SUMMARY")
  console.log("─".repeat(80))
  console.log(`   Items Total:                      ₹${Math.round(discountedItemsTotal)}`)
  console.log(`   Discount:                         -₹${Math.round(calculatedDiscount)}`)
  console.log(`   Delivery Charge:                  ₹${calculatedShipping}`)
  if (calculatedGiftWrap > 0) {
    console.log(`   Gift Wrap:                        ₹${calculatedGiftWrap}`)
  }
  console.log(`   FINAL AMOUNT (${paymentMethod}):  ₹${Math.round(calculatedTotal)}`)
}

function logDeliveryTierPricingMatrix(context: {
  products: Array<{ title: string; quantity: number; price: number }>
  deliveryTier: string
  itemsSubtotalAfterDiscount: number
  giftWrapFee: number
  standardIncludedDeliveryCharge: number
  onlineStandardDeliveryCharge: number
  onlineExpressDeliveryCharge: number
  codStandardDeliveryCharge: number
  codExpressDeliveryCharge: number
}) {
  if (!DEBUG_LOGS) return

  const {
    products,
    deliveryTier,
    itemsSubtotalAfterDiscount,
    giftWrapFee,
    standardIncludedDeliveryCharge,
    onlineStandardDeliveryCharge,
    onlineExpressDeliveryCharge,
    codStandardDeliveryCharge,
    codExpressDeliveryCharge,
  } = context

  const selectedTier = (deliveryTier || "STANDARD").toUpperCase()
  const onlineAppliedCharge = selectedTier === "EXPRESS" ? onlineExpressDeliveryCharge : onlineStandardDeliveryCharge
  const codAppliedCharge = selectedTier === "EXPRESS" ? codExpressDeliveryCharge : codStandardDeliveryCharge
  const onlineTotal = Math.max(0, itemsSubtotalAfterDiscount + onlineAppliedCharge + giftWrapFee)
  const codTotal = Math.max(0, itemsSubtotalAfterDiscount + codAppliedCharge + giftWrapFee)

  console.log("\n" + "─".repeat(80))
  console.log("🧾 DELIVERY TIER + PRICE MATRIX (ONLINE vs COD)")
  console.log("─".repeat(80))
  console.log(`Selected Tier: ${selectedTier}`)
  console.log(`Standard Included (Catalog): ₹${Math.round(standardIncludedDeliveryCharge)}`)
  console.log("Products:")
  products.forEach((product, index) => {
    const lineTotal = Math.round((Number(product.price) || 0) * (Number(product.quantity) || 0))
    console.log(`  ${index + 1}. ${product.title} | Qty: ${product.quantity} | Line Price: ₹${lineTotal}`)
  })
  console.log(`ONLINE (${selectedTier}) -> Delivery: ₹${Math.round(onlineAppliedCharge)} | Total: ₹${Math.round(onlineTotal)}`)
  console.log(`COD (${selectedTier}) -> Delivery: ₹${Math.round(codAppliedCharge)} | Total: ₹${Math.round(codTotal)}`)
  console.log("─".repeat(80) + "\n")
}

// ─── Input Validators ───────────────────────────────────────
function validatePincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode)
}

function validatePhone(phone: string): boolean {
  return /^[0-9]{10}$/.test(phone)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const VALID_PAYMENT_METHODS = ["ONLINE", "COD"] as const
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number]

function isValidPaymentMethod(value: any): value is PaymentMethod {
  return VALID_PAYMENT_METHODS.includes(value)
}

type CourierRateBreakdown = {
  standardRate: number | null
  expressRate: number | null
  standardTopRates: Array<{ courier: string; rate: number; etd?: string | null }>
  expressTopRates: Array<{ courier: string; rate: number; etd?: string | null }>
  standardRateSource: "surface" | "fallback_any" | "unavailable"
  expressRateSource: "air" | "fallback_any" | "unavailable"
  standardCourierOptionCount: number
  expressCourierOptionCount: number
  totalCourierOptionCount: number
}

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric
}

function getLowestRate(rates: Array<{ rate: number }> | null | undefined): number | null {
  if (!Array.isArray(rates) || rates.length === 0) return null
  const numericRates = rates.map(rate => toPositiveNumber(rate.rate)).filter(rate => rate > 0)
  if (numericRates.length === 0) return null
  return Math.min(...numericRates)
}

function sortCouriersByLowestRate(couriers: CourierOption[]): CourierOption[] {
  return [...couriers].sort((a, b) => {
    const aRate = toPositiveNumber(a.rate)
    const bRate = toPositiveNumber(b.rate)
    if (aRate === 0 && bRate === 0) return 0
    if (aRate === 0) return 1
    if (bRate === 0) return -1
    return aRate - bRate
  })
}

function toTopRates(couriers: CourierOption[]): Array<{ courier: string; rate: number; etd?: string | null }> {
  return sortCouriersByLowestRate(couriers).slice(0, 5).map(courier => ({
    courier: courier.courier_name,
    rate: Math.round(toPositiveNumber(courier.rate)),
    etd: courier.estimated_delivery ?? null,
  }))
}

function getItemWeightKg(product: any, item: any): number {
  const productWeight = toPositiveNumber(product?.weight)
  if (productWeight > 0) return productWeight
  
  // Weight is mandatory - product MUST have a weight
  throw new Error(
    `Product "${product?.title}" is missing a valid weight. Weight is mandatory for shipping calculations.`
  )
}

function getCourierRateBreakdown(couriers: CourierOption[]): CourierRateBreakdown {
  const standardOptions = sortCouriersByLowestRate(couriers.filter(courier => courier.is_surface))
  const expressOptions = sortCouriersByLowestRate(couriers.filter(courier => !courier.is_surface))
  const allSortedOptions = sortCouriersByLowestRate(couriers)
  const standardTopRates = toTopRates(standardOptions)
  const expressTopRates = toTopRates(expressOptions)
  const allTopRates = toTopRates(allSortedOptions)

  if (standardOptions.length > 0) {
    return {
      standardRate: getLowestRate(standardTopRates),
      expressRate: getLowestRate(expressTopRates),
      standardTopRates,
      expressTopRates,
      standardRateSource: "surface",
      expressRateSource: expressOptions.length > 0 ? "air" : "unavailable",
      standardCourierOptionCount: standardOptions.length,
      expressCourierOptionCount: expressOptions.length,
      totalCourierOptionCount: couriers.length,
    }
  }

  return {
    standardRate: getLowestRate(allTopRates),
    expressRate: getLowestRate(expressTopRates) ?? getLowestRate(allTopRates),
    standardTopRates: allTopRates,
    expressTopRates,
    standardRateSource: couriers.length > 0 ? "fallback_any" : "unavailable",
    expressRateSource: expressOptions.length > 0 ? "air" : couriers.length > 0 ? "fallback_any" : "unavailable",
    standardCourierOptionCount: 0,
    expressCourierOptionCount: expressOptions.length,
    totalCourierOptionCount: couriers.length,
  }
}

// ─── Main POST Handler ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  try {
    const body = await req.json()
    const {
      items,
      address,
      couponCode,
      giftWrap,
      giftMessage,
      deliveryTier,
      paymentMethod,
      guestEmail,
      guestName,
      guestPhone,
    } = body

    debugLog("[Create Order Debug] Incoming address payload", {
      selectedAddressIdFromClient: address?.id ?? null,
      name: address?.name,
      phone: address?.phone,
      line1: address?.line1,
      city: address?.city,
      state: address?.state,
      pincode: address?.pincode,
      type: address?.type,
    })

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty. Please add items." },
        { status: 400 }
      )
    }

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 items per order" },
        { status: 400 }
      )
    }

    for (const item of items) {
      if (!item.productId || typeof item.productId !== "string") {
        return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 })
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json(
          { error: `Invalid quantity for product. Must be between 1 and 100.` },
          { status: 400 }
        )
      }
    }

    if (!address || typeof address !== "object") {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 }
      )
    }

    const requiredAddressFields = ["name", "phone", "line1", "city", "state", "pincode"]
    for (const field of requiredAddressFields) {
      if (!address[field]) {
        return NextResponse.json(
          { error: `Address: ${field} is required` },
          { status: 400 }
        )
      }
    }

    if (!validatePincode(address.pincode)) {
      return NextResponse.json(
        { error: "Invalid pincode. Please enter 6-digit pincode." },
        { status: 400 }
      )
    }

    if (!validatePhone(address.phone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please enter 10-digit phone." },
        { status: 400 }
      )
    }

    if (!paymentMethod || !isValidPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method selected" },
        { status: 400 }
      )
    }

    if (address.name.length < 2 || address.name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      )
    }

    let orderUserId = session?.user?.id ?? null

    // Guest checkout: create or reuse a lightweight customer profile by email.
    if (!orderUserId) {
      if (!guestEmail || typeof guestEmail !== "string" || !validateEmail(guestEmail.trim())) {
        return NextResponse.json(
          { error: "Valid email is required for guest checkout" },
          { status: 400 }
        )
      }

      const normalizedGuestEmail = guestEmail.trim().toLowerCase()
      const normalizedGuestName = (guestName || address.name || "Guest Customer").toString().trim()
      const normalizedGuestPhone = (guestPhone || address.phone || "").toString().trim()

      const guestUser = await prisma.user.upsert({
        where: { email: normalizedGuestEmail },
        update: {
          name: normalizedGuestName,
          ...(normalizedGuestPhone ? { phone: normalizedGuestPhone } : {}),
        },
        create: {
          email: normalizedGuestEmail,
          name: normalizedGuestName,
          role: "CUSTOMER",
          ...(normalizedGuestPhone ? { phone: normalizedGuestPhone } : {}),
        },
        select: { id: true },
      })

      orderUserId = guestUser.id
    }

    if (!orderUserId) {
      return NextResponse.json(
        { error: "Unable to resolve order user" },
        { status: 500 }
      )
    }

    // ─── Prisma replaces connectDB ──────────────────────────

    // ─── Fetch products ─────────────────────────────────────
    const productIds = items.map(i => i.productId)

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        weight: true,
        price: true,
        originalPrice: true,
        finalPrice: true,
        discountType: true,
        discountPercent: true,
        stock: true,
        title: true,
        images: true
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products in your cart are no longer available" },
        { status: 404 }
      )
    }

    // ─── Subtotal ───────────────────────────────────────────
    let calculatedSubtotal = 0
    let discountedItemsTotal = 0
    let totalShipmentWeightKg = 0
    const standardIncludedDeliveryPerItem = getStandardIncludedDeliveryCharge()

    const itemsWithDbPrice = items.map(cartItem => {
      const product = products.find(p => p.id === cartItem.productId)

      if (!product) {
        throw new Error(`Product not found: ${cartItem.productId}`)
      }

      if (!product.stock || product.stock <= 0) {
        throw new Error(`${product.title} is out of stock`)
      }

      if (product.stock < cartItem.quantity) {
        throw new Error(
          `${product.title} has only ${product.stock} item(s) available, but you requested ${cartItem.quantity}`
        )
      }

      // Server-authoritative pricing: never trust cart item price from client payload.
      const finalDisplayUnitPrice = Math.max(0, getCatalogEffectivePrice(product))
      const originalDisplayUnitPrice = Math.max(
        finalDisplayUnitPrice,
        getCatalogOriginalEffectivePrice(product) ?? finalDisplayUnitPrice
      )

      const finalBaseUnitPrice = Math.max(0, finalDisplayUnitPrice - standardIncludedDeliveryPerItem)
      const originalBaseUnitPrice = Math.max(0, originalDisplayUnitPrice - standardIncludedDeliveryPerItem)
      const discountAmount = Math.max(0, originalBaseUnitPrice - finalBaseUnitPrice)
      const discountPercent = Number(product.discountPercent || 0)

      const gstSnapshot = calculateGstInclusivePrice(originalBaseUnitPrice, discountAmount, 18)

      const baseLineTotal = gstSnapshot.originalPrice * cartItem.quantity
      const effectiveLineTotal = gstSnapshot.finalPrice * cartItem.quantity
      const originalDisplayLineTotal = originalDisplayUnitPrice * cartItem.quantity
      const finalDisplayLineTotal = finalDisplayUnitPrice * cartItem.quantity
      const deliveryChargeForItem = standardIncludedDeliveryPerItem * cartItem.quantity
      totalShipmentWeightKg += getItemWeightKg(product, cartItem) * cartItem.quantity

      debugLog("[Create Order Debug] Product pricing", {
        productId: product.id,
        title: product.title,
        quantity: cartItem.quantity,
        finalDisplayUnitPrice,
        originalDisplayUnitPrice,
        originalUnitPrice: gstSnapshot.originalPrice,
        discountAmount: gstSnapshot.discountAmount,
        finalPrice: gstSnapshot.finalPrice,
        gstAmount: gstSnapshot.gstAmount,
        basePrice: gstSnapshot.basePrice,
        baseLineTotal,
        effectiveLineTotal,
        deliveryChargeForItem,
      })

      calculatedSubtotal += originalDisplayLineTotal
      discountedItemsTotal += finalDisplayLineTotal

      return {
        productId: product.id,
        quantity: cartItem.quantity,
        price: Math.round(gstSnapshot.originalPrice),
        title: product.title,
        image: Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : "",
        // ✅ Snapshot product discount info at purchase time
        originalPrice: Math.round(gstSnapshot.originalPrice),
        discountAmount: Math.round(gstSnapshot.discountAmount * 100) / 100,
        finalPrice: Math.round(gstSnapshot.finalPrice),
        discountPercent: Number(product.discountPercent || 0),
        discountType: product.discountType || null,
        gstRate: Math.round(gstSnapshot.gstRate),
        gstAmount: Math.round(gstSnapshot.gstAmount * 100) / 100,
        basePrice: Math.round(gstSnapshot.basePrice * 100) / 100,
      }
    })

    // ─── Coupon ─────────────────────────────────────────────
    let calculatedDiscount = Math.max(0, calculatedSubtotal - discountedItemsTotal)
    let appliedCoupon = null

    if (couponCode && couponCode.trim()) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      })

      if (!coupon) {
        return NextResponse.json(
          { error: "Coupon code is invalid or expired" },
          { status: 400 }
        )
      }

      if (coupon.minOrder && discountedItemsTotal < coupon.minOrder) {
        return NextResponse.json(
          { error: `Minimum order value of ₹${coupon.minOrder} required` },
          { status: 400 }
        )
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { error: "This coupon has reached its maximum usage limit" },
          { status: 400 }
        )
      }

      let couponDiscount = 0
      if (coupon.discountType === "PERCENTAGE") {
        couponDiscount = Math.round((discountedItemsTotal * coupon.discountValue) / 100)
      } else {
        couponDiscount = Math.min(coupon.discountValue, discountedItemsTotal)
      }

      calculatedDiscount += couponDiscount
      calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal)

      appliedCoupon = {
        _id: coupon.id,
        code: coupon.code,
      }
    }

    // ─── Shipping ───────────────────────────────────────────
    let calculatedShipping = 0
    const standardIncludedDeliveryCharge = getStandardIncludedDeliveryCharge()
    let expressTotalDeliveryCharge = 0
    let codHandlingCharge = 0

    const tier = (deliveryTier || "STANDARD").toUpperCase()

    if (tier !== "STANDARD" && tier !== "EXPRESS") {
      return NextResponse.json(
        { error: "Invalid delivery option selected" },
        { status: 400 }
      )
    }

    let prepaidBreakdown: CourierRateBreakdown | null = null
    let codBreakdown: CourierRateBreakdown | null = null

    try {
      const pickupLocation = await getPickupLocation()
      const shipmentWeightKg = Math.max(0.5, totalShipmentWeightKg)
      const prepaidResult = await checkServiceability({
        pickup_postcode: pickupLocation.pincode,
        delivery_postcode: address.pincode,
        weight: shipmentWeightKg,
        cod: false,
      })

      if (prepaidResult.available) {
        prepaidBreakdown = getCourierRateBreakdown(prepaidResult.couriers)
      }

      // Always fetch COD rates too so backend can log ONLINE vs COD delivery pricing.
      const codResult = await checkServiceability({
        pickup_postcode: pickupLocation.pincode,
        delivery_postcode: address.pincode,
        weight: shipmentWeightKg,
        cod: true,
      })

      if (codResult.available) {
        codBreakdown = getCourierRateBreakdown(codResult.couriers)
      }
    } catch (shiprocketError) {
      debugWarn("[Create Order Debug] Shiprocket charge lookup failed", shiprocketError)
    }

    const shippingSnapshot = paymentMethod === "COD"
      ? (codBreakdown ?? prepaidBreakdown)
      : prepaidBreakdown

    if (shippingSnapshot) {
      expressTotalDeliveryCharge = shippingSnapshot.expressRate ?? 0
    }

    const fallbackStandardRate = prepaidBreakdown?.standardRate ?? codBreakdown?.standardRate ?? standardIncludedDeliveryCharge
    const standardRate = fallbackStandardRate
    const expressRate = shippingSnapshot?.expressRate ?? standardRate
    const codRate = codBreakdown?.standardRate ?? standardRate
    expressTotalDeliveryCharge = expressRate

    const standardDeliveryChargeForComparison = standardRate

    // NEW LOGIC: Calculate charges based on included delivery base (default ₹499)
    // Standard delivery: FREE (included base) + handling charge if above base
    // Express delivery: Surcharge = Express rate - included base
    let standardHandlingCharge = 0
    let expressAdditionalDeliveryCharge = 0
    codHandlingCharge = 0

    if (tier === "STANDARD") {
      // For standard tier: handling charge = shiprocket rate - included base (if positive)
      standardHandlingCharge = getHandlingChargeForStandard(standardRate)
    } else {
      // For express tier: surcharge = express rate - included base (if positive)
      expressAdditionalDeliveryCharge = getExpressChargeAfterStandard(expressRate)
    }

    if (paymentMethod === "COD") {
      // For COD: additional handling = cod rate - included base (if positive)
      const codHandlingFromRate = getHandlingChargeForStandard(codRate)
      if (tier === "STANDARD") {
        standardHandlingCharge = Math.max(standardHandlingCharge, codHandlingFromRate)
      } else {
        expressAdditionalDeliveryCharge += codHandlingFromRate
      }
      codHandlingCharge = codHandlingFromRate
    }

    calculatedShipping = tier === "EXPRESS"
      ? expressAdditionalDeliveryCharge
      : standardHandlingCharge

    const standardRateSource = prepaidBreakdown?.standardRateSource ?? codBreakdown?.standardRateSource ?? "unavailable"
    const expressRateSource = shippingSnapshot?.expressRateSource ?? "unavailable"
    const standardCourierOptionCount = prepaidBreakdown?.standardCourierOptionCount ?? codBreakdown?.standardCourierOptionCount ?? 0
    const expressCourierOptionCount = shippingSnapshot?.expressCourierOptionCount ?? 0
    const totalCourierOptionCount = Math.max(prepaidBreakdown?.totalCourierOptionCount ?? 0, codBreakdown?.totalCourierOptionCount ?? 0)

    // Explicit snapshot to compare Shiprocket rates with storefront totals.
    debugLog("[Create Order Debug] Shiprocket rate snapshot before order create", {
      paymentMethod,
      deliveryTier: tier,
      prepaidStandardRate: prepaidBreakdown?.standardRate ?? null,
      prepaidExpressRate: prepaidBreakdown?.expressRate ?? null,
      codStandardRate: codBreakdown?.standardRate ?? null,
      codExpressRate: codBreakdown?.expressRate ?? null,
      standardRateUsedForCatalogPrice: standardIncludedDeliveryCharge,
      standardRateUsedForComparison: standardDeliveryChargeForComparison,
      expressTotalDeliveryRateUsed: expressTotalDeliveryCharge,
      expressAdditionalDeliveryCharge,
      codHandlingCharge,
      finalAppliedShippingCharge: calculatedShipping,
    })

    debugLog("[Create Order Debug] Delivery pricing", {
      paymentMethod,
      deliveryTier: tier,
      standardDeliveryChargeFromShiprocket: prepaidBreakdown?.standardRate ?? null,
      codStandardDeliveryChargeFromShiprocket: codBreakdown?.standardRate ?? null,
      standardRateSource,
      expressDeliveryChargeFromShiprocket: shippingSnapshot?.expressRate ?? null,
      expressRateSource,
      standardCourierOptionCount,
      expressCourierOptionCount,
      totalCourierOptionCount,
      standardDeliveryChargeIncludedInProductPrice: standardIncludedDeliveryCharge,
      expressDeliveryChargeTotal: expressTotalDeliveryCharge,
      expressAdditionalDeliveryCharge,
      codHandlingCharge,
      standardDeliveryChargeApplied: paymentMethod === "COD" ? codHandlingCharge : 0,
      expressDeliveryChargeApplied: calculatedShipping,
      appliedDeliveryCharge: calculatedShipping,
      note: tier === "STANDARD"
        ? (paymentMethod === "COD"
          ? "COD handling charge applied; standard delivery already included in item prices"
          : "Standard delivery already included in item prices")
        : (paymentMethod === "COD"
            ? "COD handling charge plus express surcharge applied"
            : "Express delivery surcharge applied"),
    })

    const onlineStandardChargeForTiering = getHandlingChargeForStandard(prepaidBreakdown?.standardRate ?? standardRate)
    const onlineExpressChargeForTiering = getExpressChargeAfterStandard(prepaidBreakdown?.expressRate ?? expressRate)
    const codStandardChargeForTiering = getHandlingChargeForStandard(codBreakdown?.standardRate ?? codRate)
    const codExpressChargeForTiering = getExpressChargeAfterStandard(codBreakdown?.expressRate ?? expressRate) + codStandardChargeForTiering

    logDeliveryTierPricingMatrix({
      products: itemsWithDbPrice,
      deliveryTier: tier,
      itemsSubtotalAfterDiscount: Math.max(0, discountedItemsTotal - calculatedDiscount),
      giftWrapFee: 0,
      standardIncludedDeliveryCharge,
      onlineStandardDeliveryCharge: onlineStandardChargeForTiering,
      onlineExpressDeliveryCharge: onlineExpressChargeForTiering,
      codStandardDeliveryCharge: codStandardChargeForTiering,
      codExpressDeliveryCharge: codExpressChargeForTiering,
    })

    const calculatedGiftWrap = giftWrap ? 9 : 0

    const calculatedTotal = Math.max(
      0,
      calculatedSubtotal - calculatedDiscount + calculatedShipping + calculatedGiftWrap
    )

    if (calculatedTotal < 0 || calculatedTotal > 100000000) {
      return NextResponse.json(
        { error: "Invalid order amount. Please try again." },
        { status: 400 }
      )
    }

    // ─── Log Structured Delivery Breakdown ──────────────────
    logDeliveryBreakdown({
      paymentMethod,
      deliveryTier: tier,
      products: itemsWithDbPrice,
      totalShipmentWeightKg,
      calculatedSubtotal,
      calculatedDiscount,
      discountedItemsTotal,
      standardIncludedDeliveryCharge,
      prepaidBreakdown,
      codBreakdown,
      standardRate,
      expressRate,
      codRate,
      expressAdditionalDeliveryCharge,
      codHandlingCharge,
      calculatedShipping,
      calculatedGiftWrap,
      calculatedTotal,
    })

    // ─── Razorpay ───────────────────────────────────────────
    let razorpayOrder
    const isMockPayment = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(calculatedTotal * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}_${orderUserId.substring(0, 8)}`,
        notes: {
          userId: orderUserId,
          coupon: appliedCoupon?.code || null,
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: "Failed to create payment order. Please try again." },
        { status: 500 }
      )
    }

    const orderNumber = await generateOrderId()
    const invoiceNumber = await generateInvoiceNumber()

    const existingAddressCount = await prisma.address.count({
      where: {
        userId: orderUserId,
        orderId: null,
      }
    })

    debugLog("[Create Order Debug] Existing saved addresses before order", {
      userId: orderUserId,
      existingAddressCount,
      note: "Order flow below creates an order-linked address snapshot (orderId set) without affecting saved address list."
    })

    const estimatedDelivery = new Date()
    if (tier === "EXPRESS") {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 1)
    } else {
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3)
    }

    // If a saved address ID is provided, fetch authoritative saved-address values.
    // This prevents any accidental drift/duplication while still creating an order-linked snapshot.
    let addressForOrderSnapshot = {
      name: address.name.trim(),
      phone: address.phone,
      line1: address.line1.trim(),
      line2: address.line2?.trim() || null,
      city: address.city.trim(),
      state: address.state.trim(),
      pincode: address.pincode,
      type: address.type || "home",
    }

    if (session?.user?.id && typeof address.id === "string" && address.id.trim()) {
      const savedAddress = await prisma.address.findFirst({
        where: {
          id: address.id,
          userId: orderUserId,
          orderId: null,
        },
        select: {
          name: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          pincode: true,
          type: true,
        },
      })

      if (savedAddress) {
        addressForOrderSnapshot = {
          name: savedAddress.name,
          phone: savedAddress.phone,
          line1: savedAddress.line1,
          line2: savedAddress.line2,
          city: savedAddress.city,
          state: savedAddress.state,
          pincode: savedAddress.pincode,
          type: savedAddress.type || "home",
        }
      }
    }

    // ─── Create Order + explicit order-linked address snapshot (Prisma) ───
    debugLog("[Create Order Debug] Creating order and explicit order-linked address snapshot")
    const dbOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: orderUserId,
          orderId: orderNumber,
          invoiceNumber: invoiceNumber,
          subtotal: calculatedSubtotal,
          discount: calculatedDiscount,
          shipping: calculatedShipping,
          deliveryTier: tier,
          giftWrapFee: calculatedGiftWrap,
          totalAmount: calculatedTotal,
          couponCode: appliedCoupon?.code || null,
          giftWrap: !!giftWrap,
          giftMessage: giftMessage?.trim() || "",
          razorpayOrderId: razorpayOrder?.id || null,
          paymentMethod,
          paymentStatus: paymentMethod === "ONLINE" ? "PENDING" : "COD",
          status: paymentMethod === "ONLINE" ? "PENDING" : "CONFIRMED",
          estimatedDelivery,
          items: {
            create: itemsWithDbPrice
          },
        }
      })

      await tx.address.create({
        data: {
          userId: orderUserId,
          orderId: createdOrder.id,
          name: addressForOrderSnapshot.name,
          phone: addressForOrderSnapshot.phone,
          line1: addressForOrderSnapshot.line1,
          line2: addressForOrderSnapshot.line2,
          city: addressForOrderSnapshot.city,
          state: addressForOrderSnapshot.state,
          pincode: addressForOrderSnapshot.pincode,
          type: addressForOrderSnapshot.type,
        },
      })

      return createdOrder
    })

    if (paymentMethod === "COD") {
      const orderForNotification = await prisma.order.findUnique({
        where: { id: dbOrder.id },
        include: {
          items: {
            select: {
              title: true,
              quantity: true,
              price: true,
              originalPrice: true,
              finalPrice: true,
              discountAmount: true,
              discountPercent: true,
            },
          },
          address: {
            select: {
              name: true,
              phone: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              pincode: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      })

      if (orderForNotification) {
        await sendOrderCommunications({
          order: {
            orderId: orderForNotification.orderId,
            createdAt: orderForNotification.createdAt,
            totalAmount: orderForNotification.totalAmount,
            subtotal: orderForNotification.subtotal,
            discount: orderForNotification.discount,
            shipping: orderForNotification.shipping,
            giftWrapFee: orderForNotification.giftWrapFee,
            paymentMethod: orderForNotification.paymentMethod,
            paymentStatus: orderForNotification.paymentStatus,
            status: orderForNotification.status,
            couponCode: orderForNotification.couponCode,
            razorpayOrderId: orderForNotification.razorpayOrderId,
            items: orderForNotification.items,
            address: orderForNotification.address,
          },
          user: orderForNotification.user,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        orderNumber,
        orderId: razorpayOrder?.id || null,
        dbOrderId: dbOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_mock_key",
        isMockPayment,
        summary: {
          subtotal: calculatedSubtotal,
          discount: calculatedDiscount,
          shipping: calculatedShipping,
          giftWrap: calculatedGiftWrap,
          total: calculatedTotal,
        },
      },
      { status: 200 }
    )

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create order. Please try again." },
      { status: 500 }
    )
  }
}
