import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"
import { generateInquiryNumber } from "@/lib/generateInquiryNumber"

const hasMailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)

const transporter = hasMailCredentials
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, company, productType, quantity, message } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      )
    }

    // Save to database
    const inquiryNumber = await generateInquiryNumber()
    const inquiry = await prisma.bulkInquiry.create({
      data: {
        inquiryNumber,
        name,
        email,
        phone,
        company: company || null,
        productType: productType || "",
        quantity: quantity || null,
        message: message || null,
        status: "pending"
      }
    })

    if (transporter) {
      const emailFooter = `
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #0284c7;">
          <p style="margin: 0; color: #0c4a6e; font-size: 13px;">
            <strong>Pro Tip:</strong> For faster processing, please keep your phone number handy for our follow-up call.
          </p>
        </div>
      `

      try {
        await transporter.sendMail({
  from: `"MTS Service Inc." <${process.env.EMAIL_USER}>`,
  to: email,
  subject: `Inquiry Received - ${inquiryNumber}`,
  html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">Thank You for Your Inquiry!</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for submitting your inquiry! We've received your request and will review it shortly.
                </p>

                <div style="background: white; padding: 20px; border-left: 4px solid #f97316; margin: 20px 0; border-radius: 4px;">
  <h3 style="margin-top: 0; color: #1f2937;">Your Inquiry Details:</h3>

  <table width="100%" style="font-size: 14px; color: #374151;">
    <tr>
      <td><strong>Product Type:</strong></td>
      <td style="text-align: right;">${productType}</td>
    </tr>
    <tr>
      <td><strong>Quantity:</strong></td>
      <td style="text-align: right;">${quantity || "Not specified"}</td>
    </tr>
    ${company ? `
    <tr>
      <td><strong>Organization:</strong></td>
      <td style="text-align: right;">${company}</td>
    </tr>` : ""}
    <tr>
      <td><strong>Contact Phone:</strong></td>
      <td style="text-align: right;">${phone}</td>
    </tr>
  </table>
</div>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Our sales team will contact you within 24 hours with:
                  <ul style="color: #374151; padding-left: 20px;">
                    <li>Special pricing</li>
                    <li>Product availability details</li>
                    <li>Custom delivery solutions</li>
                    <li>Warranty & support options</li>
                  </ul>
                </p>

                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  In the meantime, if you have any questions, feel free to reach out to us at:
                  <br/>
                 <div className="space-y-2">
  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
    <Phone className="w-4 h-4 text-green-600" />
    <span>+91 87430 94186</span>
  </div>

  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
    <Mail className="w-4 h-4 text-blue-600" />
    <span>contact@mtsservice.com</span>
  </div>
</div>
                </p>

                ${emailFooter}

                <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">
                  Best regards,<br/>
                  <strong>MTS Service Team</strong>
                  <br/>
                  Professional Tech Repair & Refurbished Products
                </p>
              </div>
            </div>
          `
        })
      } catch (mailError) {
        console.error(" inquiry customer email failed:", mailError)
      }

      try {
        await transporter.sendMail({
          from: `"MTS Service Inc." <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
          subject: `🔔 New Inquiry - ${inquiryNumber} (${productType})`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>New Inquiry Received</h2>
              <p><strong>Inquiry Number:</strong> ${inquiryNumber}</p>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Company:</strong> ${company || "N/A"}</p>
              <p><strong>Product Type:</strong> ${productType}</p>
              <p><strong>Quantity:</strong> ${quantity || "N/A"}</p>
              <p><strong>Message:</strong></p>
              <p>${message || "No additional message"}</p>
              <p><strong>Inquiry ID:</strong> ${inquiry.id}</p>
            </div>
          `
        })
      } catch (mailError) {
        console.error("inquiry admin email failed:", mailError)
      }
    } else {
      console.warn(" inquiry email notifications skipped because Gmail credentials are not configured")
    }

    return NextResponse.json({
      success: true,
      message: " inquiry submitted successfully",
      inquiryId: inquiry.id,
      inquiryNumber
    })

  } catch (error) {
    console.error(" inquiry error:", error)
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 }
    )
  }
}
