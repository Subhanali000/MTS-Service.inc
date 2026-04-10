import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Core sending utility
export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Keep these on for debugging during development
      debug: false,
      logger: false,
    });

    await transporter.sendMail({
      from: `"MTS Services.Inc" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Welcome email delivered to: ${to}`);
  } catch (error: any) {
    console.error("❌ Welcome Email Error:", error.message);
  }
}

export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  password?: string // optional, only for Google signup
) {
  const subject = "Welcome to MTS Services.Inc – Your Journey Begins";

  // Only include password section if password is provided
  const passwordHtml = password
    ? `
    <tr>
      <td style="padding: 40px 50px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
          Your account password is:
        </p>
        <p style="font-weight:bold; background-color:#f4f4f4; padding:15px 20px; border-radius:8px; display:inline-block; font-family: monospace; letter-spacing: 1px; margin-bottom: 15px;">
          ${password}
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          You can use this password to log in and start shopping for high-quality refurbished devices.
        </p>
        <p style="text-align: center; margin-top: 20px;">
          <a href="https://mtsservice.in/login" 
             style="background-color: #0f172a; color: #ffffff; padding: 12px 30px; text-decoration: none; font-size: 15px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; border-radius: 6px; display: inline-block;">
            Login Now
          </a>
        </p>
      </td>
    </tr>
  `
    : "";

  const html = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; padding: 50px 0;">
  <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <tr>
      <td style="background-color: #0f172a; padding: 35px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 2px; font-weight: 600;">
          MTS TechStore
        </h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">
          Refurbished Laptops • Desktops • Accessories
        </p>
      </td>
    </tr>

    <!-- WELCOME MESSAGE -->
    <tr>
      <td style="padding: 45px 40px;">
        <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">
          Welcome, ${name || "Customer"} 👋
        </h2>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin-bottom: 18px;">
          Your account has been successfully created. We're excited to have you onboard!
        </p>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin-bottom: 25px;">
          Discover high-performance refurbished laptops and desktops at unbeatable prices — fully tested, certified, and ready to use.
        </p>

        <!-- CTA BUTTON -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mtsservice.in/login" 
             style="background-color: #2563eb; color: #ffffff; padding: 14px 40px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 1px; border-radius: 6px; display: inline-block;">
            Start Shopping
          </a>
        </div>

        <!-- FEATURES -->
        <div style="margin-top: 30px;">
          <p style="font-size: 14px; color: #374151; margin-bottom: 8px;">✔ Certified Refurbished Devices</p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 8px;">✔ Warranty & Quality Tested</p>
          <p style="font-size: 14px; color: #374151;">✔ Affordable & Reliable Technology</p>
        </div>

        <!-- PASSWORD SECTION -->
        ${passwordHtml}

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          Smart Tech. Better Prices. Trusted Quality.
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">
          © 2026 MTS TechStore | All Rights Reserved
        </p>
      </td>
    </tr>

  </table>
</div>
`;

  await sendEmail({ to: email, subject, html });
}
