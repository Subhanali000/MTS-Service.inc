import nodemailer from "nodemailer"
import { formatINR } from "@/lib/money"
import { getStandardIncludedDeliveryCharge } from "@/lib/pricing"

type NotificationItem = {
  title: string
  quantity: number
  price: number
  originalPrice?: number | null
  finalPrice?: number | null
  discountAmount?: number | null
  discountPercent?: number | null
}

type NotificationAddress = {
  name: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  pincode: string
}

type NotificationOrder = {
  orderId: string
  createdAt: Date | string
  totalAmount: number
  subtotal: number
  discount: number
  shipping: number
  giftWrapFee?: number
  paymentMethod: string
  paymentStatus: string
  status: string
  couponCode?: string | null
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  items: NotificationItem[]
  address?: NotificationAddress | null
}

type NotificationUser = {
  name?: string | null
  email?: string | null
  phone?: string | null
}

type NotificationInput = {
  order: NotificationOrder
  user: NotificationUser
}

function money(value: number): string {
  return `INR ${formatINR(value).replace(/^₹/, "")}`
}

function moneyRight(value: number): string {
  return money(value)
}

function shippingLabel(value: number): string {
  return value > 0 ? money(value) : "FREE Delivery"
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  )
}

function digitsOnly(input: string): string {
  return (input || "").replace(/\D/g, "")
}

function normalizeOrderAmounts(order: NotificationOrder) {
  const subtotal = Math.max(0, Number(order.subtotal || 0))
  const discount = Math.max(0, Number(order.discount || 0))
  const shipping = Math.max(0, Number(order.shipping || 0))
  const giftWrap = Math.max(0, Number(order.giftWrapFee || 0))
  const computedTotal = Math.max(0, subtotal - discount + shipping + giftWrap)
  const totalAmount = Number.isFinite(Number(order.totalAmount))
    ? Math.max(0, Number(order.totalAmount))
    : computedTotal

  return {
    subtotal,
    discount,
    shipping,
    giftWrap,
    totalAmount,
  }
}

function getDisplayUnitPrice(item: NotificationItem): number {
  const standardIncludedDelivery = getStandardIncludedDeliveryCharge()
  const unitBase = Number(item.finalPrice ?? item.price ?? 0)
  return Math.max(0, Math.round(unitBase + standardIncludedDelivery))
}

function summaryLine(label: string, value: string, width = 42): string {
  const cleanLabel = label.trim()
  const cleanValue = value.trim()
  const spaces = Math.max(1, width - cleanLabel.length - cleanValue.length)
  return `${cleanLabel}${" ".repeat(spaces)}${cleanValue}`
}

function buildInvoiceText(order: NotificationOrder, user: NotificationUser): string {
  const amounts = normalizeOrderAmounts(order)
  const invoiceUrl = `${appBaseUrl()}/api/invoice/${order.orderId}`
  const transactionUrl = `${appBaseUrl()}/api/transection/${order.orderId}`
  const lines: string[] = []

  lines.push("MTS Service Inc - TAX INVOICE")
  lines.push("----------------------------------------")
  lines.push(`Invoice / Order No: ${order.orderId}`)
  lines.push(`Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`)
  lines.push(`Customer: ${user.name || "Customer"}`)
  lines.push(`Email: ${user.email || "N/A"}`)
  lines.push(`Phone: ${user.phone || order.address?.phone || "N/A"}`)
  lines.push("")

  if (order.address) {
    lines.push("Delivery Address:")
    lines.push(`  ${order.address.name}`)
    lines.push(`  ${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}`)
    lines.push(`  ${order.address.city}, ${order.address.state} - ${order.address.pincode}`)
    lines.push(`  Phone: ${order.address.phone}`)
    lines.push("")
  }

  lines.push("Items:")
  order.items.forEach((item, idx) => {
    const itemPrice = getDisplayUnitPrice(item)
    const itemQty = Math.max(0, Number(item.quantity || 0))
    lines.push(
      `  ${idx + 1}. ${item.title} x ${itemQty} @ ${money(itemPrice)} = ${money(itemPrice * itemQty)}`
    )
  })

  lines.push("")
  lines.push(summaryLine("Subtotal", money(amounts.subtotal)))
  if (amounts.discount > 0) {
    lines.push(summaryLine("Discount", `-${money(amounts.discount)}`))
  }
  lines.push(summaryLine("Shipping", shippingLabel(amounts.shipping)))
  if (amounts.giftWrap > 0) {
    lines.push(summaryLine("Gift Wrap", money(amounts.giftWrap)))
  }
  lines.push(summaryLine("Total", money(amounts.totalAmount)))
  lines.push(`Payment Method: ${order.paymentMethod}`)
  lines.push(`Payment Status: ${order.paymentStatus}`)
  lines.push(`Order Status: ${order.status}`)

  if (order.couponCode) lines.push(`Coupon: ${order.couponCode}`)
  if (order.razorpayOrderId) lines.push(`Razorpay Order ID: ${order.razorpayOrderId}`)
  if (order.razorpayPaymentId) lines.push(`Razorpay Payment ID: ${order.razorpayPaymentId}`)

  lines.push("")
  lines.push(`Track Order: ${appBaseUrl()}/orders`)
  lines.push(`Invoice Download: ${invoiceUrl}`)
  lines.push(`Transaction Download: ${transactionUrl}`)
  lines.push("----------------------------------------")
  lines.push("This is a system generated invoice.")

  return lines.join("\n")
}

function buildEmailHtml(order: NotificationOrder, user: NotificationUser): string {
  const amounts = normalizeOrderAmounts(order)
  const trackingUrl = `${appBaseUrl()}/orders`
  const invoiceUrl = `${appBaseUrl()}/api/invoice/${order.orderId}`
  const transactionUrl = `${appBaseUrl()}/api/transection/${order.orderId}`

  const itemRows = order.items
    .map(
      (item) => {
        const itemPrice = getDisplayUnitPrice(item)
        const itemQty = Math.max(0, Number(item.quantity || 0))
        return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f2f2f2;">${item.title}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f2f2f2;text-align:center;">${itemQty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f2f2f2;text-align:right;">${money(itemPrice * itemQty)}</td>
      </tr>`
      }
    )
    .join("")

  const discountRow =
    amounts.discount > 0
      ? `<tr>
          <td style="padding:4px 0;color:#374151;font-size:13px;">Discount</td>
          <td style="padding:4px 0;color:#374151;font-size:13px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">-${moneyRight(amounts.discount)}</td>
        </tr>`
      : ""

  const giftWrapRow =
    amounts.giftWrap > 0
      ? `<tr>
          <td style="padding:4px 0;color:#374151;font-size:13px;">Gift Wrap</td>
          <td style="padding:4px 0;color:#374151;font-size:13px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${moneyRight(amounts.giftWrap)}</td>
        </tr>`
      : ""

  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #ececec;border-radius:14px;overflow:hidden;">
    <div style="background:#111827;color:#fff;padding:18px 22px;">
      <h2 style="margin:0;font-size:20px;">Order Confirmed</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Order #${order.orderId}</p>
    </div>

    <div style="padding:22px;">
      <p style="margin:0 0 14px;color:#374151;">Hi ${user.name || "Customer"}, your order was placed successfully.</p>

      <table style="width:100%;font-size:14px;color:#111827;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 0;color:#6b7280;font-size:12px;">Item</th>
            <th style="text-align:center;padding:6px 0;color:#6b7280;font-size:12px;">Qty</th>
            <th style="text-align:right;padding:6px 0;color:#6b7280;font-size:12px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding:12px;background:#fafafa;border-radius:10px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#374151;font-size:13px;">Subtotal</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${moneyRight(amounts.subtotal)}</td>
          </tr>
          ${discountRow}
          <tr>
            <td style="padding:4px 0;color:#374151;font-size:13px;">Shipping</td>
            <td style="padding:4px 0;color:#374151;font-size:13px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${shippingLabel(amounts.shipping)}</td>
          </tr>
          ${giftWrapRow}
          <tr>
            <td style="padding:8px 0 0;color:#111827;font-size:14px;font-weight:700;">Total</td>
            <td style="padding:8px 0 0;color:#111827;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${moneyRight(amounts.totalAmount)}</td>
          </tr>
        </table>
      </div>

      <p style="margin:14px 0 0;font-size:13px;color:#4b5563;">Payment: ${order.paymentMethod} (${order.paymentStatus})</p>
      <p style="margin:4px 0 0;font-size:13px;color:#4b5563;">Status: ${order.status}</p>

      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${trackingUrl}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Track Order</a>
        <a href="${invoiceUrl}" style="background:#f3f4f6;color:#111827;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Download Invoice</a>
        <a href="${transactionUrl}" style="background:#e5e7eb;color:#111827;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;">Download Transaction</a>
      </div>
    </div>
  </div>`
}

async function fetchInvoicePdfAttachment(orderId: string) {
  const invoiceUrl = `${appBaseUrl()}/api/invoice/${orderId}`

  try {
    const response = await fetch(invoiceUrl)
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.toLowerCase().includes("application/pdf")) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const content = Buffer.from(arrayBuffer)
    if (!content.length) return null

    return {
      filename: `invoice-${orderId}.pdf`,
      content,
      contentType: "application/pdf",
    }
  } catch {
    return null
  }
}

async function sendEmail(input: NotificationInput): Promise<void> {
  const { user, order } = input
  if (!user.email) return
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  const invoiceText = buildInvoiceText(order, user)
  const invoicePdfAttachment = await fetchInvoicePdfAttachment(order.orderId)
  const attachments = invoicePdfAttachment ? [invoicePdfAttachment] : []

  await transporter.sendMail({
    from: `"MTS Service Inc" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Order ${order.orderId} confirmation, receipt and invoice`,
    html: buildEmailHtml(order, user),
    text: invoiceText,
    attachments,
  })
}

async function sendWhatsApp(input: NotificationInput): Promise<void> {
  const { order } = input

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  const rawTo = input.user.phone || order.address?.phone || ""

  if (!accountSid || !authToken || !from || !rawTo) return

  const toDigits = digitsOnly(rawTo)
  if (!toDigits) return

  const to = toDigits.startsWith("91") ? `whatsapp:+${toDigits}` : `whatsapp:+91${toDigits}`
  const invoiceUrl = `${appBaseUrl()}/api/invoice/${order.orderId}`
  const transactionUrl = `${appBaseUrl()}/api/transection/${order.orderId}`
  const trackingUrl = `${appBaseUrl()}/orders`

  const body = [
    `MTS Order Confirmed`,
    `Order No: ${order.orderId}`,
    `Amount: ${money(order.totalAmount)}`,
    `Payment: ${order.paymentMethod} (${order.paymentStatus})`,
    `Status: ${order.status}`,
    `Track: ${trackingUrl}`,
    `Invoice: ${invoiceUrl}`,
    `Transaction: ${transactionUrl}`,
  ].join("\n")

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const form = new URLSearchParams({
    From: from,
    To: to,
    Body: body,
  })

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WhatsApp send failed: ${text}`)
  }
}

export async function sendOrderCommunications(input: NotificationInput): Promise<void> {
  const tasks = [sendEmail(input), sendWhatsApp(input)]

  const results = await Promise.allSettled(tasks)
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("[Order Notifications]", result.reason)
    }
  })
}
