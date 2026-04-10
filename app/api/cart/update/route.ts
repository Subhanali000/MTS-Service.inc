import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 🔐 Auth (NO guest)
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await req.json();
    const productId = body.productId;
    const quantity = Number(body.quantity);

    // ✅ Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid productId" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) {
      return NextResponse.json(
        { success: false, message: "Invalid quantity" },
        { status: 400 }
      );
    }

    // ⚡ Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // ✅ Validate product
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) throw new Error("Product not found");

      if (quantity > product.stock) {
        throw new Error("Not enough stock");
      }

      // ✅ Ensure cart exists
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      // ✅ Find existing item
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      /* ======================
         UPDATE ITEM
      ====================== */

      if (quantity === 0) {
        // ❌ Remove item
        if (existingItem) {
          await tx.cartItem.delete({
            where: { id: existingItem.id },
          });
        }
      } else if (existingItem) {
        // 🔄 Set quantity (same behavior as your mongoose version)
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity },
        });
      } else {
        // ➕ Add item
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }

      // ✅ Fetch updated cart
      const updatedCart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // ✅ Total calculation
      const total =
        updatedCart?.items.reduce(
          (sum, item) =>
            sum + Number(item.product.price) * item.quantity,
          0
        ) || 0;

      return {
        cart: updatedCart,
        total,
      };
    });

    return NextResponse.json({
      success: true,
      items: result.cart?.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      })),
      count: result.cart?.items.length || 0,
      total: result.total,
    });

  } catch (error: any) {
    console.error("Cart update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Cart update failed",
      },
      { status: 500 }
    );
  }
}