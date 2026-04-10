import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { code, cartTotal } = await req.json()

  if (!code) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      isActive: true,
    },
  })

  if (!coupon) {
    return NextResponse.json(
      { error: "Invalid or expired coupon code" },
      { status: 404 }
    )
  }

  // ── Validation ──
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return NextResponse.json(
      { error: "This coupon has expired" },
      { status: 400 }
    )
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json(
      { error: "This coupon has reached its usage limit" },
      { status: 400 }
    )
  }

  if (cartTotal < coupon.minOrder) {
    return NextResponse.json(
      { error: `Minimum order of ₹${coupon.minOrder} required` },
      { status: 400 }
    )
  }

  // ── Discount calculation ──
  const discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((cartTotal * coupon.discountValue) / 100)
      : coupon.discountValue

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    label: coupon.title,
    discount,
  })
}
export async function GET() {
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      code: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      minOrder: true,
    },
  })

  const normalised = coupons.map((c) => ({
    code: c.code,
    label: c.title,
    description: c.description,
    type: c.discountType === "PERCENTAGE" ? "pct" : "flat",
    value: c.discountValue,
    minOrder: c.minOrder,
  }))

  return NextResponse.json(normalised)
}