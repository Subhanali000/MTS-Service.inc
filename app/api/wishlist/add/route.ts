import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Path to your NextAuth config
import { prisma } from "@/lib/prisma";   // Path to your Prisma client

type WishlistRow = {
  productId: string;
};

/**
 * GET: Fetch all product IDs in user's wishlist
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    });

    // Map to a simple array of IDs for easier frontend consumption
    const items = wishlistItems.map((item: WishlistRow) => item.productId);

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Wishlist GET Error:", error);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}

/**
 * POST: Toggle (Add/Remove) a product from wishlist
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, action } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const userId = session.user.id;

    if (action === "add") {
      // upsert prevents crashes if the item already exists
      await prisma.wishlist.upsert({
        where: {
          userId_productId: { userId, productId },
        },
        update: {}, // Do nothing if it exists
        create: { userId, productId },
      });
    } else if (action === "remove") {
      await prisma.wishlist.deleteMany({
        where: { userId, productId },
      });
    }

    // Always return the fresh list of IDs
    const updatedItems = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });

    return NextResponse.json({ 
      success: true, 
      items: updatedItems.map((item: WishlistRow) => item.productId) 
    });
  } catch (error) {
    console.error("Wishlist POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}