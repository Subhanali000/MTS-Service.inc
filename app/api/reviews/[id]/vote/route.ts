import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

// ──────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { vote } = await req.json()

    if (vote !== "up" && vote !== "down") {
      return NextResponse.json({ error: "Invalid vote" }, { status: 400 })
    }

    const userId = session.user.email

    const review = await prisma.review.findUnique({
      where: { id },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const voters = (review.voters as any[]) || []

    const existing = voters.find((v: any) => v.userId === userId)

    // ── Already voted ─────────────────────────────────────
    if (existing) {
      return NextResponse.json({
        helpful: review.helpful,
        unhelpful: review.unhelpful,
        myVote: existing.vote,
        alreadyVoted: true,
      })
    }

    // ── Update counts + voters ────────────────────────────
    const updatedVoters = [...voters, { userId, vote }]

    const updated = await prisma.review.update({
      where: { id },
      data: {
        helpful: vote === "up" ? { increment: 1 } : undefined,
        unhelpful: vote === "down" ? { increment: 1 } : undefined,
        voters: updatedVoters,
      },
    })

    return NextResponse.json({
      helpful: updated.helpful,
      unhelpful: updated.unhelpful,
      myVote: vote,
      alreadyVoted: false,
    })
  } catch (err) {
    console.error("PATCH vote error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}