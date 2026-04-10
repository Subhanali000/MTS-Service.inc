import { NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

type ResetLookupUser = {
  id: string
  email: string
  resetPasswordExpire: Date | null
}

const userModel = prisma.user as any

// ✅ Validate token
export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params

    if (!token) {
      return NextResponse.json({ valid: false, message: "Token missing" }, { status: 400 })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = (await userModel.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: {
          gt: new Date(),
        },
      },
      select: {
        email: true,
        resetPasswordExpire: true,
      },
    })) as ResetLookupUser | null

    if (!user) {
      return NextResponse.json({ valid: false, message: "Invalid or expired token" }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      expiresAt: user.resetPasswordExpire,
    })
  } catch (error) {
    console.error("[ERROR][GET] Token validation failed:", error)
    return NextResponse.json({ valid: false, message: "Server error" }, { status: 500 })
  }
}

// ✅ Reset password
export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params

    if (!token) {
      return NextResponse.json({ message: "Token missing" }, { status: 400 })
    }

    const { password } = await req.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = (await userModel.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
      },
    })) as { id: string; email: string } | null

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await userModel.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    })

    return NextResponse.json({ message: "Password reset successful" })
  } catch (error) {
    console.error("[ERROR][POST] Password reset failed:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}