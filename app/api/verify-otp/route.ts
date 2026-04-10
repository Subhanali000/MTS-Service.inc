import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email;
    const otp = body?.otp ?? body?.Otp;
    const name = body?.name;
    const password = body?.password;
    const provider = body?.provider;
    const userProvider = provider || "email"; // ✅ default provider

    /* ---------------- VALIDATION ---------------- */
    if (!email || !otp) {
      await prisma.otp.deleteMany({ where: { email } });
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    /* ------------- Otp CHECK ------------- */
    const OtpData = await prisma.otp.findFirst({
      where: { email },
    });

    if (!OtpData || Date.now() > new Date(OtpData.expiresAt).getTime()) {
      await prisma.otp.deleteMany({ where: { email } });
      return NextResponse.json(
        { success: false, message: "Otp expired. Please resend." },
        { status: 400 }
      );
    }

    if (String(OtpData.code) !== String(otp)) {
      return NextResponse.json(
        { success: false, message: "Incorrect OTP code." },
        { status: 400 }
      );
    }

    /* ------------- USER CHECK ------------- */
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already registered",
          code: "USER_EXISTS",
        },
        { status: 409 }
      );
    }

    /* ------------- PASSWORD ------------- */
    let hashedPassword: string;
    let plainPassword: string | undefined = undefined;

    if (userProvider === "google") {
      plainPassword = crypto.randomBytes(12).toString("base64").slice(0, 12);
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    } else {
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            message: "Password is required for email signup",
          },
          { status: 400 }
        );
      }
      plainPassword = password;
      hashedPassword = await bcrypt.hash(password, 10);
    }

    /* ------------- CONSTRUCT USER DATA ------------- */
    const userData: any = {
      name,
      email,
      role: "CUSTOMER",
      provider: userProvider,
      acceptedTerms: true,
      termsAcceptedAt: new Date(),
      isActive: true,
      password: hashedPassword,
      emailVerified: userProvider === "email" ? new Date() : null,
    };

    console.log("userData ready for DB:", userData);

    /* ------------- SAVE USER ------------- */
    const newUser = await prisma.user.create({
      data: userData,
    });

    /* ------------- DELETE Otp ------------- */
    await prisma.otp.deleteMany({
      where: { email },
    });

    /* ------------- SEND WELCOME EMAIL ------------- */
    try {
      await sendWelcomeEmail(email, name, plainPassword);
    } catch (err) {
      console.error("❌ Failed to send welcome email:", err);
    }

    return NextResponse.json({
      success: true,
      message:
        "Account created successfully! Check your email for a welcome message.",
      generatedPassword:
        userProvider === "google" ? plainPassword : undefined,
    });
  } catch (error: any) {
    console.error("❌ Registration/Verify Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error. Try again later." },
      { status: 500 }
    );
  }
}