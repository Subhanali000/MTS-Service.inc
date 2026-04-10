// src/lib/mailer.ts

import nodemailer from "nodemailer"

// ✅ Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendWelcomeEmail(
  email: string,
  password: string,
  name?: string
) {
  console.log("📨 Sending Welcome Email...")
  console.log("👉 To:", email)

  try {
    await transporter.verify()
    console.log("✅ SMTP verified")

    const info = await transporter.sendMail({
      from: `"MTS Service Inc" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to MTS Service Inc",

      html: `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
        
        <!-- Header -->
        <div style="background:#0a2540;color:#fff;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">MTS Service Inc</h1>
          <p style="margin:5px 0 0;font-size:12px;opacity:0.8;">Secure • Reliable • Fast</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;background:#ffffff;">
          
          <h2 style="margin-top:0;color:#333;">
            Welcome ${name || "User"}
          </h2>

          <p style="color:#555;font-size:15px;line-height:1.5;">
            Your account has been successfully created. Below are your login details.
          </p>

          <!-- Credentials Box -->
          <div style="margin:25px 0;background:#f9f9f9;padding:20px;border-radius:8px;border:1px solid #e0e0e0;">
            
            <!-- Email -->
            <div style="display:flex;align-items:center;margin-bottom:12px;">
              <span style="margin-right:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a2540">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </span>
              <span style="font-size:14px;"><b>Email:</b> ${email}</span>
            </div>

            <!-- Password -->
            <div style="display:flex;align-items:center;">
              <span style="margin-right:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a2540">
                  <path d="M12 1a5 5 0 00-5 5v4H5v12h14V10h-2V6a5 5 0 00-5-5zm-3 9V6a3 3 0 016 0v4H9z"/>
                </svg>
              </span>
              <span style="font-size:14px;"><b>Password:</b> ${password}</span>
            </div>

          </div>

          <!-- Warning -->
          <div style="display:flex;align-items:flex-start;color:#d32f2f;font-size:14px;">
            <span style="margin-right:8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#d32f2f">
                <path d="M1 21h22L12 2 1 21zm11-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </span>
            <span>
              Please change your password after your first login.
            </span>
          </div>

          <!-- Button -->
          <div style="margin-top:30px;text-align:center;">
            <a href="${process.env.NEXTAUTH_URL}/login"
              style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#0a2540;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;">
              
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M10 17l5-5-5-5v10z"/>
              </svg>

              Login to Account
            </a>
          </div>

          <p style="margin-top:20px;font-size:12px;color:#999;">
            If you did not create this account, you may ignore this email.
          </p>

        </div>

        <!-- Footer -->
        <div style="background:#f4f4f4;padding:15px;text-align:center;font-size:12px;color:#888;">
          © 2026 MTS Service Inc. All rights reserved.
        </div>

      </div>
      `,
    })

    console.log("✅ Welcome email sent!")
    console.log("📧 Message ID:", info.messageId)

  } catch (error: any) {
    console.error("❌ Welcome email failed:", error.message)
  }
}