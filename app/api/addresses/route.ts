import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── GET /api/addresses ─────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const addresses = await prisma.address.findMany({
    where: {
      userId: session.user.id,
      orderId: null,
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" }
    ]
  })

  return NextResponse.json(addresses)
}

// ─── POST /api/addresses ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { type, name, phone, line1, line2, city, state, pincode, isDefault } = body

  if (!name || !phone || !line1 || !city || !state || !pincode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const userId = session.user.id
  const normalized = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    line1: String(line1).trim(),
    line2: line2 ? String(line2).trim() : null,
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    type: type ? String(type).trim() : "home",
  }

  // Prevent duplicate saved addresses from being created repeatedly.
  const existingSameAddress = await prisma.address.findFirst({
    where: {
      userId,
      orderId: null,
      name: normalized.name,
      phone: normalized.phone,
      line1: normalized.line1,
      line2: normalized.line2,
      city: normalized.city,
      state: normalized.state,
      pincode: normalized.pincode,
    },
  })

  if (existingSameAddress) {
    if (isDefault && !existingSameAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId, orderId: null },
        data: { isDefault: false }
      })

      const updated = await prisma.address.update({
        where: { id: existingSameAddress.id },
        data: { isDefault: true }
      })
      return NextResponse.json(updated, { status: 200 })
    }

    return NextResponse.json(existingSameAddress, { status: 200 })
  }

  // unset existing default if needed
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId, orderId: null },
      data: { isDefault: false }
    })
  }

  // check if first address
  const count = await prisma.address.count({
    where: { userId, orderId: null }
  })

  const address = await prisma.address.create({
    data: {
      userId,
      orderId: null,
      type: normalized.type,
      name: normalized.name,
      phone: normalized.phone,
      line1: normalized.line1,
      line2: normalized.line2,
      city: normalized.city,
      state: normalized.state,
      pincode: normalized.pincode,
      isDefault: isDefault || count === 0
    }
  })

  return NextResponse.json(address, { status: 201 })
}

// ─── PUT /api/addresses ─────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { id, isDefault, ...rest } = body

  if (!id) {
    return NextResponse.json({ error: "Address ID required" }, { status: 400 })
  }

  const userId = session.user.id

  // verify ownership
  const existing = await prisma.address.findFirst({
    where: {
      id,
      userId,
      orderId: null,
    }
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // handle default switch
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId, orderId: null },
      data: { isDefault: false }
    })
  }

  const updated = await prisma.address.update({
    where: { id },
    data: {
      ...rest,
      isDefault
    }
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/addresses?id=xxx ───────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Address ID required" }, { status: 400 })
  }

  const userId = session.user.id

  // verify ownership
  const address = await prisma.address.findFirst({
    where: {
      id,
      userId,
      orderId: null,
    }
  })

  if (!address) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // delete
  await prisma.address.delete({
    where: { id }
  })

  // handle default fallback
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: {
        userId,
        orderId: null,
      },
      orderBy: { createdAt: "desc" }
    })

    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true }
      })
    }
  }

  return NextResponse.json({ success: true })
}