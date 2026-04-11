import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";

interface ITicketImage {
  url: string;
  uploadedAt: Date;
}

interface ITicketRequestBody {
  subject: string;
  description: string;
  orderNumber?: string;
  userId?: string;
  email?: string;
  phone?: string;
  images?: { url: string }[];
}

type UserOrderRef = {
  orderId: string | null;
}

type SupportTicketWhere = NonNullable<
  Parameters<typeof prisma.supportTicket.findMany>[0]
>["where"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status")?.trim().toLowerCase();
    const orderNumberFilter = url.searchParams.get("orderNumber")?.trim();
    const allowedStatuses = ["open", "pending", "resolved", "cancelled"];

    const userOrders = await prisma.order.findMany({
      where: { userId: session.user.id },
      select: { orderId: true },
    });

    const userOrderNumbers = userOrders
      .map((o: UserOrderRef) => o.orderId)
      .filter((orderId): orderId is string => Boolean(orderId));

    const where: NonNullable<SupportTicketWhere> = {
      OR: [
        { userId: session.user.id },
        ...(userOrderNumbers.length > 0 ? [{ orderNumber: { in: userOrderNumbers } }] : []),
      ],
    };

    if (statusFilter && allowedStatuses.includes(statusFilter)) {
      where.status = statusFilter;
    }

    if (orderNumberFilter) {
      where.orderNumber = sanitizeHtml(orderNumberFilter);
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error: any) {
    console.error("GET SupportTicket Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const hasMailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const transporter = hasMailCredentials
      ? nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        })
      : null;

    // 2️⃣ Get user session (optional)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "GUEST_USER";

    // 1️⃣ Parse JSON body
    const body: ITicketRequestBody = await req.json();
    const { subject, description, orderNumber, images, email, phone } = body;
    const cleanEmail = typeof email === "string" ? sanitizeHtml(email).trim().toLowerCase() : "";
    const userEmail = (session?.user?.email || cleanEmail || "").trim().toLowerCase();
    const cleanPhoneRaw = typeof phone === "string" ? sanitizeHtml(phone).trim() : "";
    const cleanPhone = cleanPhoneRaw.replace(/\D/g, "").slice(0, 10);
    const cleanOrderNumber = typeof orderNumber === "string" ? sanitizeHtml(orderNumber).trim() : "";

    if (!subject || !description || !cleanOrderNumber) {
      return NextResponse.json(
        { error: "Missing required fields: subject, description, or orderNumber" },
        { status: 400 }
      );
    }

    if (!session && !userEmail) {
      return NextResponse.json(
        { error: "Email is required when you are not logged in" },
        { status: 400 }
      );
    }

    const cleanSubject = sanitizeHtml(subject);
    const cleanDescription = sanitizeHtml(description);
    const descriptionWithContact = cleanPhone
      ? `${cleanDescription}\n\nContact Mobile: ${cleanPhone}`
      : cleanDescription;

    // 2️⃣ Map images to ITicketImage type
    const ticketImages: ITicketImage[] = Array.isArray(images)
      ? images
          .map((img) => {
            if (typeof img === "string") {
              return { url: img, uploadedAt: new Date() };
            }
            if (img && typeof img === "object" && typeof (img as { url?: unknown }).url === "string") {
              return { url: (img as { url: string }).url, uploadedAt: new Date() };
            }
            return null;
          })
          .filter((img): img is ITicketImage => {
            if (!img) return false;
            return /^https?:\/\/res\.cloudinary\.com\//i.test(img.url);
          })
      : [];

    if (session?.user?.id) {
      const ownedOrder = await prisma.order.findFirst({
        where: {
          userId: session.user.id,
          orderId: cleanOrderNumber,
        },
        select: { id: true },
      });

      if (!ownedOrder) {
        return NextResponse.json(
          { error: "Order not found for this user" },
          { status: 403 }
        );
      }
    }

    // 3️⃣ Generate collision-resistant ticket number
    const ticketNumber = `TCK-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

    // 4️⃣ Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: userId || "GUEST_USER",
        orderNumber: cleanOrderNumber,
        subject: cleanSubject,
        description: descriptionWithContact,
        images: ticketImages.map((img) => ({
          url: img.url,
          uploadedAt: img.uploadedAt.toISOString(),
        })),
        status: "open",
      },
    });

    // 5️⃣ Fetch latest ticket for this order (optional)
    const latestTicket = await prisma.supportTicket.findFirst({
      where: {
        orderNumber: cleanOrderNumber,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (transporter && userEmail) {
      try {
        await transporter.sendMail({
          from: `"MTS Support" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `Support Ticket Created: ${ticket.ticketNumber}`,
         html: `
<div style="font-family: Arial, sans-serif; background-color:#f3f4f6; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb); color:white; padding:20px;">
      <h2 style="margin:0;">MTS Support</h2>
      <p style="margin:5px 0 0; font-size:13px; opacity:0.9;">
        Your support request has been successfully created
      </p>
    </div>

    <!-- Body -->
    <div style="padding:20px;">
      <p style="margin-bottom:15px;">Hello,</p>
      <p style="margin-bottom:20px;">
        Thank you for contacting our support team. Here are your ticket details:
      </p>

      <!-- Details Table -->
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; width:40%; border-bottom:1px solid #e5e7eb;">
            Ticket Number
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${ticket.ticketNumber}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            Subject
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${cleanSubject}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-bottom:1px solid #e5e7eb;">
            Order Number
          </td>
          <td style="padding:10px; color:#111827; border-bottom:1px solid #e5e7eb;">
            ${cleanOrderNumber}
          </td>
        </tr>

        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151;">
            Status
          </td>
          <td style="padding:10px; color:#16a34a; font-weight:bold;">
            Open
          </td>
        </tr>
        ${cleanPhone ? `
        <tr>
          <td style="padding:10px; font-weight:bold; color:#374151; border-top:1px solid #e5e7eb;">
            Contact Mobile
          </td>
          <td style="padding:10px; color:#111827; border-top:1px solid #e5e7eb;">
            ${cleanPhone}
          </td>
        </tr>
        ` : ""}
      </table>

      <!-- Message -->
      <p style="margin-top:20px;">
        Our team will review your request and get back to you shortly.
      </p>

      <!-- CTA -->
      
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#6b7280;">
      © ${new Date().getFullYear()} MTS Support. All rights reserved.
    </div>

  </div>
</div>

          `,
        });
      } catch (mailError) {
        console.error("Support ticket email failed:", mailError);
      }
    }

    const responseTicket = latestTicket || ticket;

    return NextResponse.json(
      {
        ...responseTicket,
        id: responseTicket.id,
        _id: responseTicket.id,
        emailSent: Boolean(transporter && userEmail),
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}