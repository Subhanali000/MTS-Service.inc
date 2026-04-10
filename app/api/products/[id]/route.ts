// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db" // Adjust this path to where your first code block is located
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { validateProductWeight } from "@/lib/config"

// ✅ Enrich product with calculated fields (Tag & ensure finalPrice exists)
const enrichProduct = (product: any) => {
  const now = new Date();
  const createdAt = new Date(product.createdAt);
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calculate Tag
  let tag = null;
  const monthsSinceCreation = Math.max(daysSinceCreation / 30, 1);
  const avgMonthlySales = (product.totalSold || 0) / monthsSinceCreation;

  if (daysSinceCreation <= 14) tag = "NEW";
  else if (product.isBestSeller || (product.totalSold || 0) > 500) tag = "BEST_SELLER";
  else if (avgMonthlySales > 50) tag = "TRENDING";

  return { ...product, tag };
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params  // ✅ unwrap params

    if (!id) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(enrichProduct(product))
  } catch (error) {
    console.error("API ERROR:", error)

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updates: Record<string, any> = { ...body }

    if (body.weight !== undefined) {
      const parsedWeight = parseFloat(body.weight)
      validateProductWeight(parsedWeight)
      updates.weight = parsedWeight
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updates,
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.product.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 })
  }
}