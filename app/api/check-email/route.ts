import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { registered: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const existingUserCount = await prisma.user.count({
      where: { email },
    });

    if (existingUserCount > 0) {
      return NextResponse.json({
        registered: true,
        message: "Email already registered",
      });
    } else {
      return NextResponse.json({ registered: false });
    }
  } catch (err: any) {
    console.error("Check email error:", err);
    return NextResponse.json(
      { registered: false, message: "Server error" },
      { status: 500 }
    );
  }
}