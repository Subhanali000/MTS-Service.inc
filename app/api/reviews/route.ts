import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// ──────────────────────────────────────────────────────────

function toStringId(id: unknown): string {
  if (!id) return ""
  return String(id)
}

function sanitizeMetrics(metrics: any) {
  return {
    quality:  metrics?.quality  > 0 ? metrics.quality  : null,
    value:    metrics?.value    > 0 ? metrics.value    : null,
    design:   metrics?.design   > 0 ? metrics.design   : null,
    delivery: metrics?.delivery > 0 ? metrics.delivery : null,
  }
}

/* ── GET /api/reviews ───────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const rawId = req.nextUrl.searchParams.get("productId")

    if (!rawId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const productId = toStringId(rawId)

    const session = await getServerSession(authOptions)
    const userId = session?.user?.email ?? null

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    })

    const withMeta = reviews.map((r: any) => {
      const voters = (r.voters as any[]) || []

      const existingVote = userId
        ? voters.find((v) => v.userId === userId)
        : null

      const { voters: _v, authorId, ...rest } = r

      return {
        ...rest,
        myVote: existingVote?.vote ?? null,
        isOwner: userId ? r.authorId === userId : false,
      }
    })

    return NextResponse.json(withMeta)
  } catch (err) {
    console.error("GET /api/reviews error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/* ── POST /api/reviews ───────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const authorId = session.user.email

    const body = await req.json()

    const {
      productId,
      author,
      rating,
      title,
      body: reviewBody,
      photos = [],
      metrics = {},
    } = body

    if (!productId || !author || !rating || !title || !reviewBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const normalizedProductId = toStringId(productId)

    // ✅ One review per user per product
    const existing = await prisma.review.findFirst({
      where: {
        productId: normalizedProductId,
        authorId,
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: "You have already reviewed this product.",
          reviewId: existing.id,
        },
        { status: 409 }
      )
    }

    const avatar = author
      .split(" ")
      .map((n: string) => n[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2)

    const review = await prisma.review.create({
      data: {
        productId: normalizedProductId,
        authorId,
        author,
        avatar,
        rating: Number(rating),
        title,
        body: reviewBody,
        verified: false,
        helpful: 0,
        unhelpful: 0,
        photos: Array.isArray(photos) ? photos.filter(Boolean) : [],
        voters: [],
        metrics: sanitizeMetrics(metrics),
      },
    })

    const { authorId: _aid, voters, ...reviewOut } = review

    return NextResponse.json(
      { ...reviewOut, isOwner: true, myVote: null },
      { status: 201 }
    )
  } catch (err) {
    console.error("POST /api/reviews error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/* ── PATCH /api/reviews ─────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const authorId = session.user.email
    const body = await req.json()

    const { reviewId, rating, title, body: reviewBody, photos, metrics } = body

    if (!reviewId) {
      return NextResponse.json({ error: "reviewId required" }, { status: 400 })
    }

    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        authorId,
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    let updatedData: any = {}

    if (title !== undefined) updatedData.title = String(title).trim()
    if (reviewBody !== undefined) updatedData.body = String(reviewBody).trim()
    if (rating !== undefined)
      updatedData.rating = Math.min(5, Math.max(1, Number(rating)))

    if (photos !== undefined) {
      updatedData.photos = Array.isArray(photos) ? photos.filter(Boolean) : []
    }

    if (metrics !== undefined) {
      const cleanMetrics = sanitizeMetrics(metrics)
      updatedData.metrics = cleanMetrics

      const vals = Object.values(cleanMetrics).filter((v): v is number => v !== null)

      if (vals.length > 0) {
        updatedData.rating =
          Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
      }
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: updatedData,
    })

    const { authorId: _aid, voters, ...reviewOut } = updated

    return NextResponse.json({ ...reviewOut, isOwner: true })
  } catch (err) {
    console.error("PATCH /api/reviews error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/* ── DELETE /api/reviews ─────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const authorId = session.user.email
    const { reviewId } = await req.json()

    if (!reviewId) {
      return NextResponse.json({ error: "reviewId required" }, { status: 400 })
    }

    const existing = await prisma.review.findFirst({
      where: {
        id: reviewId,
        authorId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    await prisma.review.delete({
      where: { id: reviewId },
    })

    return NextResponse.json({ success: true, reviewId })
  } catch (err) {
    console.error("DELETE /api/reviews error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}