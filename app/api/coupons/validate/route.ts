import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function isDbUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const maybeCode = (error as { code?: string }).code
  return maybeCode === "P1001" || maybeCode === "P1002"
}

// ─── POST /api/coupons/validate ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, cartTotal } = await req.json()

    if (!code) {
      return NextResponse.json(
        { error: "Coupon code is required" },
        { status: 400 }
      )
    }

    // ✅ Prisma query (no .lean, no connectDB)
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

    // ── Validation ─────────────────────────────────────

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

    // ── Calculate discount ─────────────────────────────
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
  } catch (error) {
    console.error("[Coupons Validate POST]", error)
    if (isDbUnavailableError(error)) {
      return NextResponse.json(
        { error: "Coupon service is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    )
  }
}

// ─── GET /api/coupons/validate ───────────────────────────────────────────────
export async function GET() {
  try {
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

    // Normalize for frontend
    const normalised = coupons.map((c: {
      code: string
      title: string
      description: string | null
      discountType: string
      discountValue: number
      minOrder: number
    }) => ({
      code: c.code,
      label: c.title,
      description: c.description,
      type: c.discountType === "PERCENTAGE" ? "pct" : "flat",
      value: c.discountValue,
      minOrder: c.minOrder,
    }))

    return NextResponse.json(normalised)
  } catch (error) {
    console.error("[Coupons Validate GET]", error)
    if (isDbUnavailableError(error)) {
      // Graceful fallback so pages depending on coupon list keep rendering.
      return NextResponse.json([])
    }
    return NextResponse.json([])
  }
}