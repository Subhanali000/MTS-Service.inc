import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const VALID_STATUSES = [
  "CANCELLED",
  "RETURN_REQUESTED",
  "EXCHANGE_REQUESTED",
] as const

type StatusType = (typeof VALID_STATUSES)[number]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderNumber } = await params

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderNumber }, { orderId: orderNumber }],
        userId: session.user.id,
      },
      include: {
        items: true,
        address: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: order.id,
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      giftWrapFee: order.giftWrapFee,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      items: order.items,
      address: order.address,
    })
  } catch (error) {
    console.error("Order fetch error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { orderNumber } = await params

    // ✅ Safe JSON parsing
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const status = body?.status?.toUpperCase()
    const reason = body?.reason || ""

    const images: string[] = Array.isArray(body?.images)
      ? body.images.filter((img: any) => typeof img === "string")
      : []

    console.log("Incoming JSON:", { status, reason, images })

    // ❌ Validate status
    if (!status || !VALID_STATUSES.includes(status as StatusType)) {
      return NextResponse.json(
        { error: "Invalid or missing status" },
        { status: 400 }
      )
    }

    // ✅ Find order
    const order = await prisma.order.findFirst({
      where: {
        orderId: orderNumber, // ✅ IMPORTANT: your schema uses orderId
        userId: session.user.id,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // 🔒 Business rules
    if (status === "CANCELLED" && ["SHIPPED", "DELIVERED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order already shipped." },
        { status: 400 }
      )
    }

    if (
      ["RETURN_REQUESTED", "EXCHANGE_REQUESTED"].includes(status) &&
      order.status !== "DELIVERED"
    ) {
      return NextResponse.json(
        { error: "Allowed only after delivery" },
        { status: 400 }
      )
    }

    // ✅ Update order
    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status,
      },
    })

    // ✅ Create action (replacement for $push)
    await prisma.orderAction.create({
      data: {
        orderId: order.id,
        type: status,
        reason,
        images,
      },
    })

    // ✅ Get latest ticket
    const latestTicket = await prisma.supportTicket.findFirst({
      where: {
        orderNumber,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      latestTicket,
    })
  } catch (error) {
    console.error("Order update error:", error)

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}