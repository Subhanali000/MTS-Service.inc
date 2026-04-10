import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, name, provider } = await request.json();

    // Ensure this is for Google signup or general signup
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert OTP record for this email
    await prisma.otp.upsert({
      where: { email },
      update: {
        code: otpCode,
        expiresAt,
      },
      create: {
        email,
        code: otpCode,
        expiresAt,
      },
    });

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send OTP email
    await transporter.sendMail({
      from: `"MTS Service.inc" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "MTS Service OTP Verification",
      html: `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
        <div style="background:#000;color:#fff;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">MTS Service</h1>
        </div>
        <div style="padding:40px;background:#fff;">
          <h2 style="color:#333;margin-top:0;">Hello ${name || "Valued Customer"},</h2>
          <p style="color:#555;font-size:16px;line-height:1.5;">
            Thank you for choosing MTS Service. We received a request to verify your account. Use the OTP below to complete your verification:
          </p>
          <div style="margin:30px 0;text-align:center;background:#f9f9f9;padding:20px;border-radius:8px;border:1px dashed #ccc;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:10px;color:#000;">${otpCode}</span>
          </div>
          <p style="color:#555;font-size:14px;line-height:1.5;">
            This code is valid for <b>10 minutes</b>. Do not share this code with anyone.
          </p>
        </div>
        <div style="background:#f4f4f4;padding:15px;text-align:center;font-size:12px;color:#888;">
          © 2026 MTS Service | Empowering Service
        </div>
      </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Send Otp Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}