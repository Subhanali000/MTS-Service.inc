import { NextResponse } from "next/server"
import crypto from "crypto"
import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

function resolveBaseUrl(requestUrl: string): string {
  const configured = (
    process.env.NEXTAUTH_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || ""
  ).trim()

  const isInvalidConfigured =
    !configured
    || configured.toLowerCase() === "undefined"
    || configured.toLowerCase() === "null"

  const fallback = new URL(requestUrl).origin
  const base = isInvalidConfigured ? fallback : configured

  return base.replace(/\/+$/, "")
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, a reset link has been sent.",
      })
    }

    // Generate raw token
    const resetToken = crypto.randomBytes(32).toString("hex")

    // Hash token before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: new Date(Date.now() + 15 * 60 * 1000),
      },
    })

    // Create reset URL
    const baseUrl = resolveBaseUrl(req.url)
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"MTS Services.inc" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Password Reset</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding:40px 0;">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h2 style="margin:0; color:#111827;">Reset Your Password</h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="color:#4b5563; font-size:16px; line-height:1.6;">
                <p>Hello ${user.name ? user.name : "there"},</p>
                <p>
                  We received a request to reset your password for your MTS Services.inc account.
                </p>
                <p>
                  Click the button below to set a new password.
                </p>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td align="center" style="padding:30px 0;">
                <a href="${resetUrl}" 
                   style="background-color:#111827; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                   Reset Password
                </a>
              </td>
            </tr>

            <!-- Expiration -->
            <tr>
              <td style="color:#6b7280; font-size:14px;">
                <p>
                  This link will expire in <strong>15 minutes</strong> for security reasons.
                </p>
              </td>
            </tr>

            <!-- Fallback -->
            <tr>
              <td style="color:#6b7280; font-size:14px; word-break:break-all;">
                <p>
                  If the button above doesn’t work, copy and paste this link into your browser:
                </p>
                <p>
                  <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:20px 0;">
                <hr style="border:none; border-top:1px solid #e5e7eb;" />
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="color:#9ca3af; font-size:12px; text-align:center;">
                <p>
                  If you did not request this password reset, you can safely ignore this email.
                </p>
                <p style="margin-top:10px;">
                  © ${new Date().getFullYear()} MTS Services.inc. All rights reserved.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `,
    })


    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent."
    })

  } catch (error) {
    console.error("Forgot Password Error:", error)

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
