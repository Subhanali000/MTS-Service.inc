import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Prisma instead of connectDB
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { formatINR } from "@/lib/money";

const DEBUG_LOGS = process.env.NODE_ENV !== "production";

function firstExistingPath(paths: string[]): string | null {
  for (const filePath of paths) {
    if (filePath && fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    // ✅ Prisma query instead of Mongoose
    const order = await prisma.order.findFirst({
      where: { orderId: orderNumber },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (DEBUG_LOGS) {
      console.log("[Transaction Receipt Debug] Order pricing snapshot", {
        orderNumber: order.orderId,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryTier: order.deliveryTier,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        giftWrapFee: order.giftWrapFee,
        totalAmount: order.totalAmount,
        transactionRef: order.razorpayOrderId,
      });
    }

    // 1. Setup font paths with robust fallbacks (workspace -> system fonts)
    const regularFont = firstExistingPath([
      path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"),
      path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"),
      path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
      "C:/Windows/Fonts/arial.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]);

    const boldFont = firstExistingPath([
      path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"),
      path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"),
      path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"),
      "C:/Windows/Fonts/arialbd.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]);

    if (!regularFont) {
      return NextResponse.json(
        {
          error: "PDF font not found",
          details:
            "Add a TTF font file at public/fonts/Roboto-Regular.ttf (or Inter/Noto), then retry invoice generation.",
        },
        { status: 500 }
      );
    }

    const logoPath = path.join(process.cwd(), "public/logo.png");

    const qrCodeDetailedData = `Order:${order.orderId}|Date:${new Date(order.createdAt).toLocaleDateString("en-IN")}|Total:₹${order.totalAmount}|Status:${order.paymentStatus}`;
    const qrCodeData = await QRCode.toDataURL(qrCodeDetailedData, {
      margin: 1,
      width: 100,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    const doc = new PDFDocument({
      margin: 35,
      size: "A4",
      font: regularFont,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.registerFont("Regular", regularFont);
    if (boldFont) doc.registerFont("Bold", boldFont);
    const useBold = boldFont ? "Bold" : "Regular";

    /* --- PDF CONTENT --- */
    const borderColor = "#D1D5DB";
    const headerBg = "#F8FAFC";
    const rowAltBg = "#FCFCFD";
    const black = "#000000";
    const labelColor = "#4B5563";

    const pageLeft = 35;
    const pageRight = 560;
    const boxWidth = pageRight - pageLeft;
    const keyX = 48;
    const valX = 380;

    const grandTotal = Math.max(0, Math.round(Number(order.totalAmount ?? 0)));
    const gstIncluded = Math.max(0, Math.round((grandTotal * 18) / 118));
    const txDate = new Date(order.createdAt)
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");

    let currentY = 22;

    // Header block
    doc.rect(pageLeft, currentY, boxWidth, 56).fillAndStroke(headerBg, borderColor);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, pageLeft + 10, currentY + 7, { width: 40 });
    }
    doc.font(useBold).fontSize(16).fillColor(black).text("MTS Services", pageLeft + 62, currentY + 14);
    doc.font("Regular").fontSize(10).fillColor(labelColor).text("Transaction Receipt", pageLeft + 62, currentY + 34);

    currentY += 72;

    // Transaction details table
    doc.rect(pageLeft, currentY, boxWidth, 28).fillAndStroke(headerBg, borderColor);
    doc.font(useBold).fontSize(10).fillColor(black).text("TRANSACTION DETAILS", pageLeft + 12, currentY + 9);
    currentY += 28;

    const detailsRows = [
      ["Transaction ID", order.razorpayOrderId || "N/A"],
      ["Order ID", order.orderId],
      ["Date", txDate],
      ["Payment Method", (order.paymentMethod || "ONLINE").toUpperCase()],
      ["Payment Status", (order.paymentStatus || "PAID").toUpperCase()],
    ] as const;

    const detailRowHeight = 22;
    doc.rect(pageLeft, currentY, boxWidth, detailRowHeight * detailsRows.length).stroke(borderColor);
    detailsRows.forEach((row, index) => {
      const rowY = currentY + index * detailRowHeight;
      if (index % 2 === 1) {
        doc.rect(pageLeft + 1, rowY + 1, boxWidth - 2, detailRowHeight - 2).fill(rowAltBg);
      }
      doc.font("Regular").fontSize(9).fillColor(labelColor).text(row[0], keyX, rowY + 7);
      doc.font(useBold).fontSize(9).fillColor(black).text(row[1], valX, rowY + 7, { width: 160, align: "right" });
      if (index < detailsRows.length - 1) {
        doc.moveTo(pageLeft, rowY + detailRowHeight).lineTo(pageRight, rowY + detailRowHeight).stroke(borderColor);
      }
    });

    currentY += detailRowHeight * detailsRows.length + 16;

    // Amount table
    doc.rect(pageLeft, currentY, boxWidth, 28).fillAndStroke(headerBg, borderColor);
    doc.font(useBold).fontSize(10).fillColor(black).text("AMOUNT", pageLeft + 12, currentY + 9);
    currentY += 28;

    const amountRows = [
      ["Amount Paid", formatINR(grandTotal)],
      ["Includes GST", `+${formatINR(gstIncluded)}`],
    ] as const;
    const amountRowHeight = 24;

    doc.rect(pageLeft, currentY, boxWidth, amountRowHeight * amountRows.length + 30).stroke(borderColor);
    amountRows.forEach((row, index) => {
      const rowY = currentY + index * amountRowHeight;
      if (index % 2 === 1) {
        doc.rect(pageLeft + 1, rowY + 1, boxWidth - 2, amountRowHeight - 2).fill(rowAltBg);
      }
      doc.font("Regular").fontSize(9).fillColor(labelColor).text(row[0], keyX, rowY + 8);
      doc.font(useBold).fontSize(9).fillColor(black).text(row[1], valX, rowY + 8, { width: 160, align: "right" });
      doc.moveTo(pageLeft, rowY + amountRowHeight).lineTo(pageRight, rowY + amountRowHeight).stroke(borderColor);
    });

    const totalRowY = currentY + amountRows.length * amountRowHeight;
    doc.rect(pageLeft + 1, totalRowY + 1, boxWidth - 2, 28).fill("#F3F4F6");
    doc.font(useBold).fontSize(10).fillColor(black).text("TOTAL", keyX, totalRowY + 9);
    doc.font(useBold).fontSize(11).fillColor(black).text(formatINR(grandTotal), valX, totalRowY + 8, {
      width: 160,
      align: "right",
    });

    currentY = totalRowY + 42;

    // Merchant table
    doc.rect(pageLeft, currentY, boxWidth, 28).fillAndStroke(headerBg, borderColor);
    doc.font(useBold).fontSize(10).fillColor(black).text("MERCHANT", pageLeft + 12, currentY + 9);
    currentY += 28;

    const merchantRows = [
      ["Name", "MTS Services Inc."],
      ["Location", "Mumbai, Maharashtra, India"],
      ["GSTIN", "27ABCDE1234F1Z5"],
    ] as const;
    const merchantRowHeight = 22;

    doc.rect(pageLeft, currentY, boxWidth, merchantRowHeight * merchantRows.length).stroke(borderColor);
    merchantRows.forEach((row, index) => {
      const rowY = currentY + index * merchantRowHeight;
      if (index % 2 === 1) {
        doc.rect(pageLeft + 1, rowY + 1, boxWidth - 2, merchantRowHeight - 2).fill(rowAltBg);
      }
      doc.font("Regular").fontSize(9).fillColor(labelColor).text(row[0], keyX, rowY + 7);
      doc.font(useBold).fontSize(9).fillColor(black).text(row[1], valX, rowY + 7, { width: 160, align: "right" });
      if (index < merchantRows.length - 1) {
        doc.moveTo(pageLeft, rowY + merchantRowHeight).lineTo(pageRight, rowY + merchantRowHeight).stroke(borderColor);
      }
    });

    // Verification QR in footer area
    const footerY = 700;
    doc.image(qrCodeData, 500, footerY - 42, { width: 38 });
    doc.font("Regular").fontSize(6).fillColor("#777777").text("Verify", 500, footerY - 2, {
      width: 38,
      align: "center",
    });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transaction-${orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : "Unexpected error";

    console.error("PDF Error:", {
      type: errorType,
      message: errorMessage,
      error,
    });

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: `${errorType}: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}