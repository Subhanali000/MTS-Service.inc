import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const dbOrderId = searchParams.get("dbOrderId")
    const orderId = searchParams.get("orderId")

    if (!dbOrderId || !orderId) {
      return NextResponse.json({ error: "Missing order details" }, { status: 400 })
    }

    const order = await prisma.order.findFirst({
      where: {
        id: dbOrderId,
        razorpayOrderId: orderId,
      },
      select: {
        id: true,
        orderId: true,
        totalAmount: true,
        subtotal: true,
        discount: true,
        shipping: true,
        giftWrapFee: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      dbOrderId: order.id,
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      giftWrapFee: order.giftWrapFee,
    })
  } catch (error) {
    console.error("Payment amount lookup error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}