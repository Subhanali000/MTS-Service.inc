import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import sanitizeHtml from "sanitize-html";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    const body = await req.json();
    const rawStatus = typeof body?.status === "string" ? body.status : "";
    const status = sanitizeHtml(rawStatus).trim().toLowerCase();

    const allowedStatuses = ["open", "pending", "resolved", "cancelled"];

    // ✅ Validate status
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Customers can only cancel their own tickets. Admin can set any allowed status.
    if (userRole !== "ADMIN" && status !== "cancelled") {
      return NextResponse.json(
        { error: "Forbidden status update" },
        { status: 403 }
      );
    }

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (userRole !== "ADMIN" && existingTicket.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ✅ Update ticket (Prisma)
    const updatedTicket = await prisma.supportTicket.update({
      where: {
        id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedTicket);

  } catch (error: any) {
    console.error("PATCH SupportTicket Error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}