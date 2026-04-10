import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function maskPhone(phone?: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return "****"
  return `******${digits.slice(-4)}`
}

export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get("orderNumber")?.trim()

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: { orderId: orderNumber },
      include: {
        items: {
          select: {
            title: true,
            quantity: true,
            price: true,
            image: true,
          },
        },
        address: {
          select: {
            city: true,
            state: true,
            pincode: true,
            phone: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Use order schema values directly (single source of truth) to avoid double-counting delivery.
    const baseSubtotal = Number.isFinite(order.subtotal)
      ? Number(order.subtotal)
      : order.items.reduce(
          (sum, item) => sum + Math.max(0, Number(item.price || 0) * Number(item.quantity || 0)),
          0
        )
    const baseDiscount = Number.isFinite(order.discount) ? Number(order.discount) : 0
    const displaySubtotal = Math.max(0, Math.round(baseSubtotal))
    const displayDiscount = Math.max(0, Math.round(baseDiscount))
    const displayTotal = Math.max(0, Math.round(order.totalAmount ?? (displaySubtotal - displayDiscount)))

    const baseLineTotals = order.items.map(item => Math.max(0, Number(item.price || 0) * Number(item.quantity || 0)))
    let allocatedDisplayTotal = 0

    const displayItems = order.items.map((item, index) => {
      let displayLineTotal = 0
      if (baseSubtotal > 0) {
        if (index === order.items.length - 1) {
          displayLineTotal = Math.max(displayTotal - allocatedDisplayTotal, 0)
        } else {
          displayLineTotal = Math.max(0, Math.round(displayTotal * (baseLineTotals[index] / baseSubtotal)))
          allocatedDisplayTotal += displayLineTotal
        }
      }

      return {
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        displayLineTotal,
      }
    })

    return NextResponse.json({
      order: {
        orderNumber: order.orderId,
        status: order.status,
        deliveryTier: order.deliveryTier,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        pricingDisplay: {
          standardIncludedDeliveryCharge: 0,
          subtotal: displaySubtotal,
          discount: displayDiscount,
          total: displayTotal,
        },
        items: displayItems,
        shippingAddress: order.address
          ? {
              city: order.address.city,
              state: order.address.state,
              pincode: order.address.pincode,
              phone: maskPhone(order.address.phone),
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Order track API error:", error)
    return NextResponse.json({ error: "Failed to track order" }, { status: 500 })
  }
}
