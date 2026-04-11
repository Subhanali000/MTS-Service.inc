
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import QRCode from "qrcode";
import { formatINR } from "@/lib/money"
import { getStandardIncludedDeliveryCharge } from "@/lib/pricing"

const DEBUG_LOGS = process.env.NODE_ENV !== "production"

type InvoiceOrderItem = {
  title: string
  quantity: number
  price: number | null
  originalPrice: number | null
  finalPrice: number | null
  discountPercent: number | null
}

function firstExistingPath(paths: string[]): string | null {
  for (const filePath of paths) {
    if (filePath && fs.existsSync(filePath)) return filePath
  }
  return null
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  // Split into Rupees and Paisa
  const rupees = Math.floor(num);
  const paisa = Math.round((num - rupees) * 100);

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

  const format = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + format(n % 100) : '');
    if (n < 100000) return format(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? format(n % 1000) : '');
    if (n < 10000000) return format(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? format(n % 100000) : '');
    return format(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? format(n % 10000000) : '');
  };

  let result = '';
  if (rupees > 0) {
    result += format(rupees) + 'Rupees ';
  }

  if (paisa > 0) {
    // Add "and" if there are also rupees
    if (rupees > 0) result += 'and ';
    result += format(paisa) + 'Paisa ';
  }

  return (result + 'Only').replace(/\s+/g, ' ').trim();
}

export async function GET(req: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await context.params
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderId: orderNumber },
          { razorpayOrderId: orderNumber },
        ],
      },
      include: {
        items: true,
        address: {
          select: {
            name: true,
            line1: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
      },
    })

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    if (DEBUG_LOGS) {
      console.log("[Invoice Debug] Order pricing snapshot", {
        orderNumber: order.orderId,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryTier: order.deliveryTier,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        giftWrapFee: order.giftWrapFee,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      })
    }

    const address = order.address
    if (!address) {
      return NextResponse.json({ error: "Order address not found" }, { status: 404 })
    }

    // Assets setup...
    const regularFont = firstExistingPath([
        path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"),
        path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"),
        path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ])
    const boldFont = firstExistingPath([
      path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"),
      path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"),
      path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"),
      "C:/Windows/Fonts/arialbd.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ])
    const logoPath = path.join(process.cwd(), "public/logo.png")
    const signPath = path.join(process.cwd(), "public/signature.png")

    if (!regularFont) {
      return NextResponse.json(
        {
          error: "PDF font not found",
          details: "Add a font file at public/fonts/Roboto-Regular.ttf",
        },
        { status: 500 }
      )
    }

    const invoiceNumber = (order as any).invoiceNumber || `INV-${order.orderId}`

    const invoiceTotalAfterDiscount = Math.max(
      0,
      Math.round(Number(order.totalAmount ?? 0))
    )

const qrCodeDetailedData = `Invoice:${invoiceNumber}|Order:${order.orderId}|Date:${new Date(order.createdAt).toLocaleDateString("en-IN")}|Total:₹${invoiceTotalAfterDiscount}|Status:${order.paymentStatus}`;
const qrCodeData = await QRCode.toDataURL(qrCodeDetailedData, {
  margin: 1,
  width: 100,
});
    const doc = new PDFDocument({ size: "A4", margin: 35, font: regularFont })
    doc.registerFont("Regular", regularFont)
    if (boldFont) doc.registerFont("Bold", boldFont)
    const regularName = "Regular"
    const boldName = boldFont ? "Bold" : "Regular"

    const buffers: Buffer[] = []
    doc.on("data", (chunk) => buffers.push(chunk))
    const pdfPromise = new Promise<Buffer>((resolve) => { doc.on("end", () => resolve(Buffer.concat(buffers))) })

    const black = "#000000", borderColor = "#CCCCCC", tableHeaderBg = "#F8F9FA", orange = "#FF6B35"

    // Professional Header
    let currentY = 25
    if (fs.existsSync(logoPath)) doc.image(logoPath, 35, 8, { width: 60 })
    doc.font(boldName).fontSize(16).fillColor(orange).text("MTS Services", 105, 15)
    doc.font(regularName).fontSize(9).fillColor(black).text("Official Invoice", 105, 32)

    currentY = 70
    doc.moveTo(35, currentY).lineTo(560, currentY).stroke(borderColor)

    // Order Info - Left & Right Layout
    currentY = 85
    doc.font(boldName).fontSize(10).text("INVOICE", 35, currentY)
    doc.font(regularName).fontSize(8).fillColor("#666666")
    doc.text(`Order No: ${order.orderId}`, 35, currentY + 18)
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 35, currentY + 28)
    doc.text(`Invoice No: ${invoiceNumber}`, 35, currentY + 38)

    doc.font(regularName).fontSize(8).fillColor("#666666")
    doc.text(`Invoice Date: ${new Date().toLocaleDateString("en-IN")}`, 350, currentY + 18)
    doc.text(`Payment: ${order.paymentMethod}`, 350, currentY + 28)
    doc.text(`Status: ${order.paymentStatus}`, 350, currentY + 38)
    if (order.razorpayOrderId) {
      doc.text(`Payment Ref: ${order.razorpayOrderId}`, 350, currentY + 48)
    }

    // Seller & Address Info
    currentY = 150
    doc.font(boldName).fontSize(9).fillColor(black).text("From", 35, currentY)
    doc.font(regularName).fontSize(8).fillColor("#333333")
    doc.text("MTS Services Inc.", 35, currentY + 15)
    doc.text("A2/11, Pankha Rd, Block A2, Janakpuri, New Delhi, Delhi, 110058,India", 35, currentY + 24)
    doc.text("PAN: AACFV3325K | GSTIN: 27ABCDE1234F1Z5", 35, currentY + 33)

    doc.font(boldName).fontSize(9).fillColor(black).text("Billing & Shipping Address", 350, currentY)
    doc.font(regularName).fontSize(8).fillColor("#333333")
    doc.text(`${address.name}`, 350, currentY + 15)
    doc.text(`${address.line1}`, 350, currentY + 24)
    doc.text(`${address.city}, ${address.state} - ${address.pincode}`, 350, currentY + 33)

    // Items table with aligned columns
    currentY = 230
    const includedDeliveryCharge = getStandardIncludedDeliveryCharge()

    const tableLeft = 35
    const tableRight = 560
    const colDescLeft = 35
    const colMrpLeft = 225
    const colDiscountLeft = 300
    const colUnitLeft = 370
    const colGstLeft = 435
    const colQtyLeft = 490
    const colTotalLeft = 525

    const headerHeight = 20
    const rowHeight = 22

    let computedGstTotal = 0
    let computedFinalTotal = 0

    doc.font(boldName).fontSize(9).fillColor(black)
    doc.text("ITEMS", 35, currentY)
    currentY += 12

    doc.rect(tableLeft, currentY, tableRight - tableLeft, headerHeight).fillAndStroke(tableHeaderBg, borderColor)
    doc.font(boldName).fontSize(7).fillColor(black)
    doc.text("Description", colDescLeft + 4, currentY + 6, { width: colMrpLeft - colDescLeft - 8 })
    doc.text("MRP", colMrpLeft + 4, currentY + 6, { width: colDiscountLeft - colMrpLeft - 8, align: "right" })
    doc.text("Discount", colDiscountLeft + 4, currentY + 6, { width: colUnitLeft - colDiscountLeft - 8, align: "right" })
    doc.text("Unit Price", colUnitLeft + 4, currentY + 6, { width: colGstLeft - colUnitLeft - 8, align: "right" })
    doc.text("GST", colGstLeft + 4, currentY + 6, { width: colQtyLeft - colGstLeft - 8, align: "right" })
    doc.text("Qty", colQtyLeft + 4, currentY + 6, { width: colTotalLeft - colQtyLeft - 8, align: "center" })
    doc.text("Total", colTotalLeft + 4, currentY + 6, { width: tableRight - colTotalLeft - 8, align: "right" })

    ;[colMrpLeft, colDiscountLeft, colUnitLeft, colGstLeft, colQtyLeft, colTotalLeft].forEach((x) => {
      doc.moveTo(x, currentY).lineTo(x, currentY + headerHeight).stroke(borderColor)
    })

    currentY += headerHeight

    const invoiceItems = order.items as InvoiceOrderItem[]

    invoiceItems.forEach((item, i) => {
      const itemHasDiscount = (item.discountPercent ?? 0) > 0
      const discountPercent = item.discountPercent ?? 0
      const unitBaseOriginal = Math.max(0, Number(item.originalPrice ?? item.price ?? 0))
      const unitBaseFinal = itemHasDiscount && (item.finalPrice ?? 0) > 0
        ? Math.max(0, Number(item.finalPrice))
        : Math.max(0, Number(item.price ?? 0))

      const unitDisplayOriginal = Math.max(0, Math.round(unitBaseOriginal + includedDeliveryCharge))
      const unitDisplayFinal = Math.max(0, Math.round(unitBaseFinal + includedDeliveryCharge))
      const lineMrp = Math.max(0, unitDisplayOriginal * item.quantity)
      const lineTotal = Math.max(0, unitDisplayFinal * item.quantity)
      const lineDiscount = Math.max(0, lineMrp - lineTotal)

      const lineGstAmount = Math.round((lineTotal * 18) / 118)
      const lineBaseAmount = Math.max(0, lineTotal - lineGstAmount)
      const unitBaseAmount = Math.max(0, Math.round(lineBaseAmount / Math.max(1, item.quantity)))

      computedGstTotal += lineGstAmount
      computedFinalTotal += lineTotal

      const itemLabel = itemHasDiscount
        ? `${i + 1}. ${item.title.substring(0, 28)} (${discountPercent}% OFF)`
        : `${i + 1}. ${item.title.substring(0, 34)}`

      doc.rect(tableLeft, currentY, tableRight - tableLeft, rowHeight).stroke(borderColor)
      ;[colMrpLeft, colDiscountLeft, colUnitLeft, colGstLeft, colQtyLeft, colTotalLeft].forEach((x) => {
        doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke(borderColor)
      })

      doc.font(regularName).fontSize(7).fillColor("#333333")
      doc.text(itemLabel, colDescLeft + 4, currentY + 7, { width: colMrpLeft - colDescLeft - 8 })
      doc.text(formatINR(lineMrp), colMrpLeft + 4, currentY + 7, { width: colDiscountLeft - colMrpLeft - 8, align: "right" })
      doc.text(`-${formatINR(lineDiscount)}`, colDiscountLeft + 4, currentY + 7, { width: colUnitLeft - colDiscountLeft - 8, align: "right" })
      doc.text(formatINR(unitBaseAmount), colUnitLeft + 4, currentY + 7, { width: colGstLeft - colUnitLeft - 8, align: "right" })
      doc.text(`+${formatINR(lineGstAmount)}`, colGstLeft + 4, currentY + 7, { width: colQtyLeft - colGstLeft - 8, align: "right" })
      doc.text(String(item.quantity), colQtyLeft + 4, currentY + 7, { width: colTotalLeft - colQtyLeft - 8, align: "center" })
      doc.text(formatINR(lineTotal), colTotalLeft + 4, currentY + 7, { width: tableRight - colTotalLeft - 8, align: "right" })

      currentY += rowHeight
    })

    // Price Summary Section (requested format)
    currentY += 10
    const summaryX = 35
    const grandTotal = Math.max(0, Math.round(Number(order.totalAmount ?? computedFinalTotal)))
    const gstIncludedSummary = Math.max(0, Math.round((grandTotal * 18) / 118))

    doc.font(boldName).fontSize(9).fillColor(black)
    doc.text("PRICE SUMMARY", summaryX, currentY)
    currentY += 16

    doc.font(regularName).fontSize(8).fillColor("#333333")
    doc.text(`Subtotal: ${formatINR(grandTotal)}`, summaryX, currentY)
    currentY += 12
    doc.text(`(Includes GST: +${formatINR(gstIncludedSummary)})`, summaryX, currentY)

    // Net product amount after discount (in black text)
    currentY += 20
    doc.moveTo(summaryX, currentY - 6).lineTo(340, currentY - 6).stroke(borderColor)
    doc.font(boldName).fontSize(11).fillColor(black)
    doc.text("TOTAL PAYABLE:", summaryX, currentY)
    doc.text(formatINR(grandTotal), 280, currentY, { width: 60, align: "right" })

    // Amount in Words
    currentY += 50
    doc.font(regularName).fontSize(7).fillColor("#666666")
    doc.text(`Amount in Words: ${numberToWords(grandTotal)}`, 35, currentY, { width: 525 })

    // Footer
    currentY = 680
    if (currentY > 700) {
      doc.addPage()
      currentY = 35
    }

    // QR moved to bottom section
    doc.image(qrCodeData, 35, currentY - 55, { width: 50 })
    doc.font(regularName).fontSize(6).fillColor("#666666").text("Scan to Verify", 35, currentY - 2, { width: 50, align: "center" })

    doc.moveTo(35, currentY).lineTo(560, currentY).stroke(borderColor)
    currentY += 15
    doc.font(regularName).fontSize(7).fillColor("#999999").text("Thank you for your purchase! This is an electronically generated invoice.", 35, currentY, { align: "center", width: 525 })
    currentY += 10
    doc.text("For more information, visit www.mtsservices.com", 35, currentY, { align: "center", width: 525 })

    doc.end()
    const pdfBuffer = await pdfPromise
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice PDF error:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}