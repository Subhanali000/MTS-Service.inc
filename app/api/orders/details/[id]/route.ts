import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStandardIncludedDeliveryCharge } from "@/lib/pricing"

/**
 * Public endpoint to fetch order details by dbOrderId (UUID)
 * Used on payment page to display order breakdown before payment
 * No authentication required - order data is non-sensitive for display purposes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const razorpayOrderId = req.nextUrl.searchParams.get("orderId")

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    if (!razorpayOrderId || typeof razorpayOrderId !== "string") {
      return NextResponse.json({ error: "Missing payment order ID" }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        razorpayOrderId,
      },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const includedDeliveryCharge = getStandardIncludedDeliveryCharge()

    return NextResponse.json({
      order: {
        id: order.id,
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        giftWrap: order.giftWrapFee,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        items: order.items.map((item) => ({
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          originalPrice: item.originalPrice,
          finalPrice: item.finalPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          originalDisplayPrice: item.originalPrice + includedDeliveryCharge,
          finalDisplayPrice: item.finalPrice + includedDeliveryCharge,
          lineOriginalTotal: (item.originalPrice + includedDeliveryCharge) * item.quantity,
          lineFinalTotal: (item.finalPrice + includedDeliveryCharge) * item.quantity,
          lineDiscountTotal: Math.max(
            0,
            (item.originalPrice + includedDeliveryCharge - (item.finalPrice + includedDeliveryCharge)) *
              item.quantity
          ),
        })),
      },
    })
  } catch (error) {
    console.error("Order details fetch error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
