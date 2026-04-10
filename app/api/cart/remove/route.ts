import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 🔐 Secure auth (NO guest)
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await req.json();
    const productId = body.productId;
    const quantity = Number(body.quantity ?? -1);
    const remove = Boolean(body.remove);

    // ✅ Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid productId" },
        { status: 400 }
      );
    }

    if (!remove && (!Number.isInteger(quantity) || quantity === 0)) {
      return NextResponse.json(
        { success: false, error: "Invalid quantity" },
        { status: 400 }
      );
    }

    const cartData = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // ✅ Ensure cart exists
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      // ✅ Find item
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      /* =========================
         COMPLETE REMOVE
      ========================= */
      if (remove) {
        if (existingItem) {
          await tx.cartItem.delete({
            where: { id: existingItem.id },
          });
        }
      }

      /* =========================
         DECREMENT / UPDATE
      ========================= */
      else if (existingItem) {
        const newQty = existingItem.quantity + quantity;

        if (newQty <= 0) {
          await tx.cartItem.delete({
            where: { id: existingItem.id },
          });
        } else {
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQty },
          });
        }
      }

      // ✅ If item doesn't exist → just return cart (no crash)

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
          (sum, item) => sum + Number(item.product.price) * item.quantity,
          0
        ) || 0;

      return {
        cart: updatedCart,
        total,
      };
    });

    return NextResponse.json({
      success: true,
      items: cartData.cart?.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      })),
      count: cartData.cart?.items.length || 0,
      total: cartData.total,
    });

  } catch (error: any) {
    console.error("Cart update error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Server error",
      },
      { status: 500 }
    );
  }
}
