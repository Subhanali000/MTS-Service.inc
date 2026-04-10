import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkServiceability, type CourierOption } from "@/lib/shiprocket"
import { getPickupLocation } from "@/lib/config"
import { generateInvoiceNumber } from "@/lib/generateInvoiceNumber"
import { getBackendDiscountedBasePrice, getCatalogEffectivePrice, getCatalogOriginalEffectivePrice, getCodHandlingCharge, getExpressExtraCharge, getStandardIncludedDeliveryCharge, getHandlingChargeForStandard, getExpressChargeAfterStandard } from "@/lib/pricing"

const DEBUG_LOGS = process.env.NODE_ENV !== "production"

function debugLog(message: string, payload?: unknown) {
  if (!DEBUG_LOGS) return
  if (payload === undefined) {
    console.log(message)
    return
  }
  console.log(message, payload)
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
  prepaidStandardRate: number | null
  prepaidExpressRate: number | null
  codStandardRate: number | null
  expressAdditionalDeliveryCharge: number
  codHandlingCharge: number
  shippingCharge: number
  calculatedGiftWrapFee: number
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
    prepaidStandardRate,
    prepaidExpressRate,
    codStandardRate,
    expressAdditionalDeliveryCharge,
    codHandlingCharge,
    shippingCharge,
    calculatedGiftWrapFee,
    calculatedTotal,
  } = context

  console.log("\n" + "═".repeat(80))
  console.log("📦 DELIVERY CHARGES BREAKDOWN - STRUCTURED DEBUG LOG")
  console.log("═".repeat(80))

  // ─── 1. ORDER ITEMS ─────────────────────────────────────
  console.log("\n📦 1️⃣  PRODUCT DETAILS")
  console.log("─".repeat(80))
  products.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.title}`)
    console.log(`       • Quantity: ${p.quantity}`)
    console.log(`       • Price: ₹${p.price}`)
  })

  // ─── 2. SUBTOTAL & DISCOUNT ─────────────────────────────
  console.log("\n💰 2️⃣  SUBTOTAL & DISCOUNT CALCULATION")
  console.log("─".repeat(80))
  console.log(`   Subtotal (Base Prices):           ₹${Math.round(calculatedSubtotal)}`)
  console.log(`   Discount Applied:                 -₹${Math.round(calculatedDiscount)}`)
  console.log(`   Items Total (After Discount):     ₹${Math.round(discountedItemsTotal)}`)
  console.log(`   Gift Wrap Fee:                    ₹${calculatedGiftWrapFee}`)

  // ─── 3. SHIPMENT INFO ───────────────────────────────────
  console.log("\n🚚 3️⃣  SHIPMENT INFORMATION")
  console.log("─".repeat(80))
  console.log(`   Total Weight:                     ${totalShipmentWeightKg}kg`)
  console.log(`   Payment Method:                   ${paymentMethod}`)
  console.log(`   Delivery Tier Selected:           ${deliveryTier}`)

  // ─── 4. STANDARD DELIVERY ───────────────────────────────
  console.log("\n📌 4️⃣  STANDARD DELIVERY CHARGES")
  console.log("─".repeat(80))
  console.log(`   Status: Standard delivery is INCLUDED in product prices ✅`)
  console.log(`   Included Charge (in catalog):     ₹${standardIncludedDeliveryCharge}`)
  console.log(`   `)
  console.log(`   Online Prepaid:`)
  if (prepaidStandardRate) {
    console.log(`     • Shiprocket Rate:              ₹${prepaidStandardRate}`)
  } else {
    console.log(`     • No standard couriers available for this route`)
  }
  console.log(`   `)
  console.log(`   Cash on Delivery (COD):`)
  if (codStandardRate) {
    console.log(`     • Shiprocket Rate:              ₹${codStandardRate}`)
  } else {
    console.log(`     • No standard couriers available for COD on this route`)
  }

  // ─── 5. EXPRESS DELIVERY ────────────────────────────────
  console.log("\n⚡ 5️⃣  EXPRESS DELIVERY CHARGES")
  console.log("─".repeat(80))
  console.log(`   Status: Express as SURCHARGE over standard ✅`)
  console.log(`   `)
  console.log(`   Online Prepaid Express:`)
  if (prepaidExpressRate) {
    console.log(`     • Shiprocket Rate:              ₹${prepaidExpressRate}`)
  } else {
    console.log(`     • No express couriers available for this route`)
  }

  // ─── 6. FINAL CHARGES FOR SELECTED TIER ──────────────────
  console.log("\n✅ 6️⃣  FINAL CHARGES FOR SELECTED TIER")
  console.log("─".repeat(80))
  console.log(`   Selected Tier: ${deliveryTier}`)
  console.log(`   `)
  
  if (deliveryTier === "STANDARD") {
    console.log(`   STANDARD DELIVERY SELECTED:`)
    console.log(`     • Product Price (includes ₹${standardIncludedDeliveryCharge} delivery): ₹${Math.round(discountedItemsTotal)}`)
    console.log(`     • Express Surcharge:            ₹0 (Not selected)`)
    if (paymentMethod === "COD") {
      console.log(`     • COD Handling Charge:          ₹${codHandlingCharge}`)
    }
    console.log(`     • Total Delivery Charge:        ₹${shippingCharge}`)
  } else {
    console.log(`   EXPRESS DELIVERY SELECTED:`)
    console.log(`     • Product Price (includes ₹${standardIncludedDeliveryCharge} standard): ₹${Math.round(discountedItemsTotal)}`)
    console.log(`     • EXPRESS Surcharge:            ₹${expressAdditionalDeliveryCharge}`)
    if (paymentMethod === "COD") {
      console.log(`     • COD Handling Charge:          ₹${codHandlingCharge}`)
    }
    console.log(`     • Total Delivery Charge:        ₹${shippingCharge}`)
  }

  // ─── 7. PAYMENT SUMMARY ─────────────────────────────────
  console.log("\n💳 7️⃣  PAYMENT SUMMARY")
  console.log("─".repeat(80))
  console.log(`   Items Total:                      ₹${Math.round(discountedItemsTotal)}`)
  console.log(`   Discount:                         -₹${Math.round(calculatedDiscount)}`)
  console.log(`   Delivery Charge:                  ₹${shippingCharge}`)
  if (calculatedGiftWrapFee > 0) {
    console.log(`   Gift Wrap:                        ₹${calculatedGiftWrapFee}`)
  }
  console.log(`   `)
  console.log(`   ╔════════════════════════════════════════════╗`)
  console.log(`   ║ FINAL AMOUNT (${paymentMethod}):         ₹${Math.round(calculatedTotal).toString().padStart(8)} ║`)
  console.log(`   ╚════════════════════════════════════════════╝`)

  console.log("\n" + "═".repeat(80))
  console.log("✅ END OF DELIVERY CHARGES BREAKDOWN")
  console.log("═".repeat(80) + "\n")
}

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric
}

function getItemWeightKg(product: any, item: any): number {
  const productWeight = toPositiveNumber(product?.weight)
  if (productWeight > 0) return productWeight
  
  // Weight is mandatory - product MUST have a weight
  throw new Error(
    `Product "${product?.title}" is missing a valid weight. Weight is mandatory for shipping calculations.`
  )
}

function toTopRates(couriers: CourierOption[]): Array<{ courier: string; rate: number; etd?: string | null }> {
  return couriers.slice(0, 5).map(courier => ({
    courier: courier.courier_name,
    rate: Math.round(toPositiveNumber(courier.rate)),
    etd: courier.estimated_delivery ?? null,
  }))
}

function getLowestRate(rates: Array<{ rate: number }> | null | undefined): number | null {
  if (!Array.isArray(rates) || rates.length === 0) return null
  const numericRates = rates.map(rate => toPositiveNumber(rate.rate)).filter(rate => rate > 0)
  if (numericRates.length === 0) return null
  return Math.min(...numericRates)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = req.nextUrl

    const DEFAULT_PAGE = 1
    const DEFAULT_LIMIT = 10
    const MAX_LIMIT = 100

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE)
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT)
    const skip = (page - 1) * limit

    const sortBy = isValidSortField(searchParams.get("sortBy"))
      ? searchParams.get("sortBy")!
      : "createdAt"

    const sortOrder = isValidSortOrder(searchParams.get("sortOrder"))
      ? searchParams.get("sortOrder")!
      : "desc"

    const rawStatus = searchParams.get("status")
    const rawSearch = searchParams.get("search")

    // ✅ Prisma filter (converted)
    const filter: any = {
      userId: session.user.id,
    }

    if (rawStatus && rawStatus !== "all") {
      if (!isValidStatus(rawStatus)) {
        return NextResponse.json(
          { error: "Invalid order status" },
          { status: 400 }
        )
      }

      filter.status = rawStatus.toUpperCase()
    }

    if (rawSearch) {
      const sanitized = rawSearch.trim()

      filter.OR = [
        {
          orderId: {
            contains: sanitized,
            mode: "insensitive",
          },
        },
        {
          items: {
            some: {
              title: {
                contains: sanitized,
                mode: "insensitive",
              },
            },
          },
        },
      ]
    }

    // ✅ Fetch orders
    const orders = await prisma.order.findMany({
      where: filter,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      include: {
        items: true,
        address: true,
        actions: {
    orderBy: { createdAt: "desc" }
  }
      },
    })

    const total = await prisma.order.count({ where: filter })

    // ✅ Get orderNumbers
    const orderNumbers = orders.map((o: any) => o.orderId)

    // ✅ Fetch tickets
    const tickets = await prisma.supportTicket.findMany({
      where: {
        orderNumber: { in: orderNumbers },
      },
    })

    const ticketMap = new Map()

    tickets.forEach((t: any) => {
      if (!ticketMap.has(t.orderNumber)) {
        ticketMap.set(t.orderNumber, [])
      }
      ticketMap.get(t.orderNumber).push(t)
    })

    const transformedOrders = orders.map((order: any) => {
      const orderTickets = ticketMap.get(order.orderId) || []
      const standardIncludedDeliveryCharge = getStandardIncludedDeliveryCharge()
      const numericSubtotal = Number.isFinite(order.subtotal)
        ? Number(order.subtotal)
        : (order.items || []).reduce(
            (sum: number, item: any) => sum + Math.max(0, Number(item.price || 0) * Number(item.quantity || 0)),
            0
          )
      const numericDiscount = Number.isFinite(order.discount) ? Number(order.discount) : 0
      const displaySubtotal = Math.max(0, Math.round(numericSubtotal))
      const displayDiscount = Math.max(0, Math.round(numericDiscount))
      const displayTotal = Math.max(
        0,
        Math.round(Number.isFinite(order.totalAmount) ? Number(order.totalAmount) : displaySubtotal - displayDiscount)
      )

      return {
        id: order.id,
        _id: order.id,

        orderNumber: order.orderId,

        items: order.items.map((item: any) => {
          const snapshotFinalPrice = Number(item.finalPrice ?? item.price ?? 0)
          const snapshotOriginalPrice = Number(item.originalPrice ?? item.price ?? 0)
          const snapshotQuantity = Number(item.quantity ?? 0)
          const displayLineTotal = snapshotFinalPrice > 0
            ? Math.max(0, Math.round((snapshotFinalPrice + standardIncludedDeliveryCharge) * snapshotQuantity))
            : 0
          const displayOriginalLineTotal = snapshotOriginalPrice > 0
            ? Math.max(0, Math.round((snapshotOriginalPrice + standardIncludedDeliveryCharge) * snapshotQuantity))
            : 0

          return {
            productId: item.productId,
            title: item.title,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            displayLineTotal,
            displayOriginalLineTotal,
            // ✅ Return discount snapshot
            originalPrice: item.originalPrice ?? undefined,
            discountAmount: item.discountAmount ?? undefined,
            finalPrice: item.finalPrice ?? undefined,
            discountPercent: item.discountPercent ?? undefined,
            discountType: item.discountType ?? undefined,
            gstRate: item.gstRate ?? undefined,
            gstAmount: item.gstAmount ?? undefined,
            basePrice: item.basePrice ?? undefined,
          }
        }),

        address: order.address,
        supportTickets: orderTickets,
        ticketCount: orderTickets.length,

        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        pricingDisplay: {
          standardIncludedDeliveryCharge,
          subtotal: displaySubtotal,
          discount: displayDiscount,
          total: displayTotal,
        },
        giftWrapFee: order.giftWrapFee,

        totalAmount: order.totalAmount,
        reason: order.reason,

        couponCode: order.couponCode,
        giftWrap: order.giftWrap,

        paymentMethod: order.paymentMethod,
        status: order.status,

        deliveryTier: order.deliveryTier,
        deliveryStatus: order.deliveryStatus,
        estimatedDelivery: order.estimatedDelivery,

        trackingId: order.trackingId,

        actions:
          order.OrderAction?.map((a: any) => ({
            type: a.type,
            reason: a.reason,
            images: a.images || [],
            createdAt: a.createdAt,
          })) || [],

        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    })

    return NextResponse.json(transformedOrders)

  } catch (error) {
    console.error("Orders fetch failed", error)

    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain items" },
        { status: 400 }
      )
    }

    if (!body.address?.line1) {
      return NextResponse.json(
        { error: "Address required" },
        { status: 400 }
      )
    }

    const paymentMethod = body.paymentMethod

    if (!isValidPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      )
    }

    type OrderStatusType = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "REFUNDED"
    const status: OrderStatusType =
      paymentMethod === "ONLINE" ? "PAID" : "PENDING"

    const orderNumber = `ORD-${Date.now()}`

    const normalizedTier = (body.deliveryTier || "STANDARD").toUpperCase()
    const standardDeliveryCharge = getStandardIncludedDeliveryCharge()

    const requestedItems = Array.isArray(body.items) ? body.items : []
    const normalizedItems: Array<{ productId: string; quantity: number }> = requestedItems
      .map((item: any) => ({
        productId: typeof item?.productId === "string" ? item.productId : "",
        quantity: Math.max(1, Number(item?.quantity ?? 1)),
      }))
      .filter((item: { productId: string; quantity: number }) => item.productId.length > 0)

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: "Order must contain valid items" },
        { status: 400 }
      )
    }

    const productIds: string[] = Array.from(new Set(normalizedItems.map((item) => item.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        weight: true,
        price: true,
        finalPrice: true,
        discountType: true,
        discountPercent: true,
        stock: true,
        images: true,
      },
    })

    const productById = new Map(products.map(product => [product.id, product]))

    let calculatedSubtotal = 0
    let discountedItemsTotal = 0
    let totalShipmentWeightKg = 0

    const itemsForCreate = normalizedItems.map((item) => {
      const product = productById.get(item.productId)

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`)
      }

      if (!product.stock || product.stock <= 0) {
        throw new Error(`${product.title} is out of stock`)
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `${product.title} has only ${product.stock} item(s) available, but you requested ${item.quantity}`
        )
      }

      const baseUnitPrice = Number(product.price || 0)
      const discountedBasePrice = getBackendDiscountedBasePrice({
        price: baseUnitPrice,
        finalPrice: Number(product.finalPrice || 0),
        discountType: product.discountType,
        discountPercent: Number(product.discountPercent || 0),
      })
      const effectiveUnitPrice = getCatalogEffectivePrice({
        price: baseUnitPrice,
        finalPrice: discountedBasePrice,
      })
      const originalUnitPrice = getCatalogOriginalEffectivePrice({
        price: baseUnitPrice,
        finalPrice: discountedBasePrice,
      }) ?? effectiveUnitPrice

      const baseLineTotal = originalUnitPrice * item.quantity
      const effectiveLineTotal = effectiveUnitPrice * item.quantity
      totalShipmentWeightKg += getItemWeightKg(product, item) * item.quantity

      calculatedSubtotal += baseLineTotal
      discountedItemsTotal += effectiveLineTotal

      return {
        productId: product.id,
        quantity: item.quantity,
        price: Math.round(originalUnitPrice),
        title: product.title,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "",
      }
    })

    let prepaidStandardRate: number | null = null
    let prepaidExpressRate: number | null = null
    let codStandardRate: number | null = null

    try {
      const pickupLocation = await getPickupLocation()
      const shipmentWeightKg = Math.max(0.5, totalShipmentWeightKg)
      const deliveryPincode = String(body?.address?.pincode ?? "").trim()

      if (/^\d{6}$/.test(deliveryPincode)) {
        const prepaidResult = await checkServiceability({
          pickup_postcode: pickupLocation.pincode,
          delivery_postcode: deliveryPincode,
          weight: shipmentWeightKg,
          cod: false,
        })

        if (prepaidResult.available) {
          const prepaidStandard = toTopRates(prepaidResult.couriers.filter(courier => courier.is_surface))
          const prepaidExpress = toTopRates(prepaidResult.couriers.filter(courier => !courier.is_surface))
          const prepaidAny = toTopRates(prepaidResult.couriers)

          prepaidStandardRate = getLowestRate(prepaidStandard) ?? getLowestRate(prepaidAny)
          prepaidExpressRate = getLowestRate(prepaidExpress) ?? getLowestRate(prepaidAny)
        }

        if (paymentMethod === "COD") {
          const codResult = await checkServiceability({
            pickup_postcode: pickupLocation.pincode,
            delivery_postcode: deliveryPincode,
            weight: shipmentWeightKg,
            cod: true,
          })

          if (codResult.available) {
            const codStandard = toTopRates(codResult.couriers.filter(courier => courier.is_surface))
            const codAny = toTopRates(codResult.couriers)
            codStandardRate = getLowestRate(codStandard) ?? getLowestRate(codAny)
          }
        }
      }
    } catch (shippingError) {
      debugLog("[Orders API Debug] Shiprocket lookup failed", shippingError)
    }

    const fallbackStandardRate = prepaidStandardRate ?? standardDeliveryCharge
    const effectiveStandardRate = fallbackStandardRate
    const effectiveExpressRate = prepaidExpressRate ?? effectiveStandardRate
    const effectiveCodRate = codStandardRate ?? effectiveStandardRate
    const expressTotalDeliveryCharge = Math.max(0, Math.round(effectiveExpressRate))
    
    // NEW LOGIC: Calculate charges based on ₹180 base
    // Standard delivery: FREE (₹180 included) + handling charge if > ₹180
    // Express delivery: Surcharge = Express rate - ₹180
    let expressAdditionalDeliveryCharge = 0
    let codHandlingCharge = 0

    if (normalizedTier === "STANDARD") {
      // For standard tier: handling charge = shiprocket rate - ₹180 (if positive)
      expressAdditionalDeliveryCharge = getHandlingChargeForStandard(effectiveStandardRate)
    } else {
      // For express tier: surcharge = express rate - ₹180 (if positive)
      expressAdditionalDeliveryCharge = getExpressChargeAfterStandard(effectiveExpressRate)
    }

    if (paymentMethod === "COD") {
      // For COD: additional handling = cod rate - ₹180 (if positive)
      const codHandlingFromRate = getHandlingChargeForStandard(effectiveCodRate)
      if (normalizedTier === "STANDARD") {
        expressAdditionalDeliveryCharge = Math.max(expressAdditionalDeliveryCharge, codHandlingFromRate)
      } else {
        expressAdditionalDeliveryCharge += codHandlingFromRate
      }
      codHandlingCharge = codHandlingFromRate
    }

    const shippingCharge = normalizedTier === "EXPRESS"
      ? expressAdditionalDeliveryCharge
      : expressAdditionalDeliveryCharge

    let calculatedDiscount = Math.max(0, calculatedSubtotal - discountedItemsTotal)
    let appliedCouponCode: string | null = null

    const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : ""
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      })

      if (!coupon) {
        return NextResponse.json({ error: "Coupon code is invalid or expired" }, { status: 400 })
      }

      if (calculatedSubtotal < Number(coupon.minOrder ?? 0)) {
        return NextResponse.json(
          { error: `Minimum order amount for this coupon is ₹${Math.round(coupon.minOrder)}` },
          { status: 400 }
        )
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 })
      }

      const couponDiscount = coupon.discountType === "PERCENTAGE"
        ? Math.round((calculatedSubtotal * Number(coupon.discountValue || 0)) / 100)
        : Math.round(Number(coupon.discountValue || 0))

      calculatedDiscount = Math.min(calculatedSubtotal, calculatedDiscount + Math.max(0, couponDiscount))
      appliedCouponCode = coupon.code
    }

    const calculatedGiftWrapFee = body.giftWrap ? 9 : 0
    const calculatedTotal = Math.max(
      0,
      calculatedSubtotal - calculatedDiscount + shippingCharge + calculatedGiftWrapFee
    )

    // ─── Log Structured Delivery Breakdown ──────────────────
    logDeliveryBreakdown({
      paymentMethod,
      deliveryTier: normalizedTier,
      products: itemsForCreate,
      totalShipmentWeightKg,
      calculatedSubtotal,
      calculatedDiscount,
      discountedItemsTotal,
      "standardIncludedDeliveryCharge": standardDeliveryCharge,
      prepaidStandardRate,
      prepaidExpressRate,
      codStandardRate,
      expressAdditionalDeliveryCharge,
      codHandlingCharge,
      shippingCharge,
      calculatedGiftWrapFee,
      calculatedTotal,
    })

    debugLog("[Orders API Debug] Product price breakdown", itemsForCreate)
    debugLog("[Orders API Debug] Shiprocket rate snapshot before order create", {
      deliveryTier: normalizedTier,
      standardDeliveryCharge: standardDeliveryCharge,
      expressTotalDeliveryCharge,
      expressAdditionalDeliveryCharge,
      "codDeliveryCharge": codStandardRate,
      codHandlingCharge,
      finalAppliedShippingCharge: shippingCharge,
    })
    debugLog("[Orders API Debug] Delivery charge breakdown", {
      deliveryTier: normalizedTier,
      standardDeliveryChargeIncludedInProductPrice: standardDeliveryCharge,
      expressDeliveryChargeTotal: expressTotalDeliveryCharge,
      expressAdditionalDeliveryCharge,
      codHandlingCharge,
      appliedDeliveryCharge: shippingCharge,
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      giftWrapFee: calculatedGiftWrapFee,
      totalAmount: calculatedTotal,
      note: normalizedTier === "STANDARD"
        ? (codHandlingCharge > 0
          ? "COD handling charge applied; standard delivery already included in item prices"
          : "Standard delivery already included in item prices")
        : (codHandlingCharge > 0
            ? "COD handling charge plus express surcharge applied"
            : "Express delivery surcharge applied"),
    })

    const invoiceNumber = await generateInvoiceNumber()

    const newOrder = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderId: orderNumber,
        invoiceNumber,

        subtotal: calculatedSubtotal,
        discount: calculatedDiscount,
        shipping: shippingCharge,
        giftWrapFee: calculatedGiftWrapFee,
        totalAmount: calculatedTotal,

        deliveryTier: normalizedTier,

        couponCode: appliedCouponCode,
        giftWrap: body.giftWrap || false,
        giftMessage: body.giftMessage || "",

        paymentMethod,
        razorpayOrderId: body.razorpayOrderId,
        status,
        paymentStatus: status === "PAID" ? "PAID" : "PENDING",

        items: {
          create: itemsForCreate,
        },

        address: {
          create: {
            ...body.address,
            user: {
              connect: { id: session.user.id },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        order: {
          id: newOrder.id,
          orderNumber: newOrder.orderId,
          status: newOrder.status,
        },
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Order create error", error)

    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
function parsePositiveInt(value: string | null, defaultValue: number): number {
  const parsed = Number(value)
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed
  }
  return defaultValue
}
const VALID_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "totalAmount",
  "status",
  "orderId"
]

function isValidSortField(field: string | null): boolean {
  return field !== null && VALID_SORT_FIELDS.includes(field)
}
const VALID_SORT_ORDERS = ["asc", "desc"]

function isValidSortOrder(order: string | null): boolean {
  return order !== null && VALID_SORT_ORDERS.includes(order.toLowerCase())
}
const VALID_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED"
]

function isValidStatus(rawStatus: string): boolean {
  return VALID_STATUSES.includes(rawStatus.toUpperCase())
}
const VALID_PAYMENT_METHODS = ["ONLINE", "COD"]

function isValidPaymentMethod(paymentMethod: any): boolean {
  return typeof paymentMethod === "string" && VALID_PAYMENT_METHODS.includes(paymentMethod.toUpperCase())
}

