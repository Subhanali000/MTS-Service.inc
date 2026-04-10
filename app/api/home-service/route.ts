import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

const gmailUser = process.env.EMAIL_USER
const gmailPass = process.env.EMAIL_PASS
const canSendEmail = Boolean(gmailUser && gmailPass)

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      phone,
      serviceType,
      address,
      city,
      zipcode,
      deviceModel,
      issueDescription,
      preferredDate
    } = body

    // Validate required fields
    if (!name || !email || !phone || !address) {
      return NextResponse.json(
        { error: "Name, email, phone, and address are required" },
        { status: 400 }
      )
    }

    // Save to database
    const booking = await prisma.homeServiceBooking.create({
      data: {
        name,
        email,
        phone,
        serviceType: serviceType || "General Service",
        address,
        city: city || null,
        zipcode: zipcode || null,
        deviceModel: deviceModel || null,
        issueDescription: issueDescription || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        status: "pending"
      }
    })

    let emailNotificationStatus: "sent" | "skipped" | "failed" = "skipped"

    if (canSendEmail) {
      const transporter = createTransporter()

      try {
        // Send confirmation email to customer
        await transporter.sendMail({
           from: `"MTS Service Inc." <${gmailUser}>`,
  to: email,
  subject: "Service Booking Confirmed - MTS Service",
 html: `
<div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#1e3a8a); color:white; padding:20px;">
      <h2 style="margin:0;">🔧 MTS Service Inc.</h2>
      <p style="margin:5px 0 0; font-size:13px; opacity:0.9;">
        Service Booking Confirmed
      </p>
    </div>

    <!-- Body -->
    <div style="padding:20px;">
      <p style="font-size:14px; color:#374151;">Hi ${name},</p>
      <p style="font-size:14px; color:#374151;">
        Your service request has been successfully created. Here are your booking details:
      </p>

      <!-- Details Table -->
      <table style="width:100%; border-collapse:collapse; margin-top:15px; font-size:14px;">
        
        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; width:40%; border-bottom:1px solid #e5e7eb;">
            🆔 Booking ID
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            #${booking.id}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            🛠 Service Type
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${serviceType}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            💻 Device Model
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${deviceModel || "Not specified"}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            📍 Address
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${address}, ${city || ""} ${zipcode || ""}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            📅 Preferred Date
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${
              preferredDate
                ? new Date(preferredDate).toLocaleDateString("en-IN")
                : "To be confirmed"
            }
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151;">
            📞 Contact Number
          </td>
          <td style="padding:10px; color:#111827;">
            ${phone}
          </td>
        </tr>

      </table>

      ${
        issueDescription
          ? `
      <!-- Issue Box -->
      <div style="background:#eff6ff; padding:15px; border-radius:8px; border:1px solid #3b82f6; margin-top:20px;">
        <p style="margin:0; font-weight:bold; color:#1e40af;">📝 Issue Description</p>
        <p style="margin:8px 0 0; font-size:13px; color:#1e3a8a;">
          ${issueDescription}
        </p>
      </div>
      `
          : ""
      }

      <!-- Steps -->
      <div style="margin-top:20px;">
        <p style="font-weight:bold; color:#111827;">🚀 What happens next?</p>
        <ul style="padding-left:18px; color:#374151; font-size:13px;">
          <li>Our team will call you within 2 hours</li>
          <li>Appointment time will be confirmed</li>
          <li>Technician will visit your location</li>
          <li>Service will be completed professionally</li>
        </ul>
      </div>

      <!-- Support -->
      <div style="background:#f9fafb; padding:15px; border-radius:8px; margin-top:20px; font-size:13px; color:#374151;">
        <p style="margin:0;"><strong>📞 +91 87430 94186</strong></p>
        <p style="margin:5px 0;"><strong>📧 service@mtsservice.com</strong></p>
        <p style="margin:0;">Mon-Sat, 10 AM - 6 PM</p>
      </div>

      <!-- Footer -->
      <p style="text-align:center; margin-top:25px; font-size:12px; color:#6b7280;">
        © ${new Date().getFullYear()} MTS Service Inc.<br/>
        Professional Laptop & Computer Repair
      </p>

    </div>
  </div>
</div>
`
        })

        // Send notification to admin
        await transporter.sendMail({
          from: gmailUser,
          to: process.env.ADMIN_EMAIL || gmailUser,
          subject: `🔔 New Home Service Booking - ${name} (${serviceType})`,
          html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>🔧 New Home Service Booking</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Service Type:</strong> ${serviceType}</p>
          <p><strong>Device Model:</strong> ${deviceModel || "N/A"}</p>
          <p><strong>Address:</strong> ${address}, ${city || ""} ${zipcode || ""}</p>
          <p><strong>Issue Description:</strong> ${issueDescription || "N/A"}</p>
          <p><strong>Preferred Date:</strong> ${preferredDate ? new Date(preferredDate).toLocaleDateString("en-IN") : "N/A"}</p>
          <p><strong>Status:</strong> Pending confirmation</p>
          <p><a href="https://mtsservice.com/admin/bookings/${booking.id}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block;">View Booking</a></p>
        </div>
      `
        })

        emailNotificationStatus = "sent"
      } catch (emailError) {
        emailNotificationStatus = "failed"
        console.error("Home service email notification failed:", emailError)
      }
    } else {
      console.warn("Home service booking saved, but email notifications are skipped because GMAIL_USER/GMAIL_PASS are missing.")
    }

    return NextResponse.json({
      success: true,
      message: "Service booking confirmed! We'll contact you shortly.",
      bookingId: booking.id,
      emailNotificationStatus
    })

  } catch (error) {
    console.error("Home service booking error:", error)
    return NextResponse.json(
      { error: "Failed to process booking" },
      { status: 500 }
    )
  }
}
