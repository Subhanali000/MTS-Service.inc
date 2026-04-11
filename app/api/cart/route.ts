import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 🔐 Auth
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
    const quantity = Number(body.quantity ?? 1);

    // ✅ Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid productId" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid quantity" },
        { status: 400 }
      );
    }

    if (Math.abs(quantity) > 10) {
      return NextResponse.json(
        { success: false, error: "Quantity limit exceeded" },
        { status: 400 }
      );
    }

    // ⚡ Transaction
    const cartData = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) throw new Error("Product not found");

      if (quantity > 0 && product.stock < quantity) {
        throw new Error("Not enough stock");
      }

      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (existingItem) {
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
      } else if (quantity > 0) {
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

      // ✅ Calculate total HERE (correct place)
      const total =
        updatedCart?.items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
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
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch the cart including items and the associated product details
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ success: true, items: [], total: 0 });
    }

    const total = cart.items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity),
      0
    );

    return NextResponse.json({
      success: true,
      items: cart.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      })),
      total,
    });

  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
