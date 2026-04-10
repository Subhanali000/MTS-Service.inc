"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import Image from "next/image"
import { Toaster } from "react-hot-toast"
import Loader from "@/components/Loader";
import { useSession } from "next-auth/react";
import {
  Package, Truck, CheckCircle2, Clock, ChevronRight,
  MapPin, RotateCcw, ShoppingBag, Search, Filter,
  ChevronDown, ChevronUp, Star, MessageSquare, X,
  AlertCircle, Loader2, RefreshCw, Home, Circle,
  Download, FileText,UploadCloud
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { formatINR } from "@/lib/money"
import { splitHandlingCharge } from "@/lib/pricing"
const deliveryLabels: Record<string, string> = {
  STANDARD: "STANDARD",
  EXPRESS: "EXPRESS",

}
const ENABLE_MOCK_PAYMENT = process.env.NEXT_PUBLIC_ENABLE_MOCK_PAYMENT === "true"
interface ReviewModalProps {
  item: OrderItem
  onClose: () => void
}
type SupportTicket = {
  _id: string;
  ticketNumber: string;       // ✅ add this
  userId: string;
  orderNumber?: string;
  subject: string;
  description: string;
  images?: { url: string; uploadedAt: Date }[];
  status: "open" | "pending" | "resolved";
  createdAt: string;          // use string if coming from backend
  updatedAt: string;
}
// ─── Types ─────────────────────────────────────────────────────────────────
type IOrderAction = {
  type: string  // e.g., "EXCHANGE_REQUESTED" | "RETURN_REQUESTED" | "CANCELLED"
  reason?: string
  images?: (string | { url: string; uploadedAt: Date })[];  // URLs of uploaded images
  createdAt: string | Date
}
// Updated to include return and exchange
type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "shipped" 
  | "out_for_delivery" 
  | "delivered" 
  | "cancelled" 
 
  | "exchange_requested" 
  | "returned";
type DeliveryTier = "STANDARD" | "EXPRESS"

type OrderItem = {
  productId: string
  title: string
  image: string
  price: number
  quantity: number
  displayLineTotal?: number
  displayOriginalLineTotal?: number
  // ✅ Product discount snapshot
  originalPrice?: number
  discountAmount?: number
  finalPrice?: number
  discountPercent?: number
  discountType?: string | null
  gstRate?: number
  gstAmount?: number
  basePrice?: number
}

type Order = {
  id: string
  orderNumber: string
  items: OrderItem[]
  address: {
    name: string
    phone: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
 latestTicket?: SupportTicket; // will come from backend
  supportTickets?: {
    _id: string;
    ticketNumber: string;
    status: string;
    createdAt: string;
  }[];
  ticketCount?: number;
  subtotal: number
  discount: number
  shipping: number
  pricingDisplay?: {
    standardIncludedDeliveryCharge: number
    subtotal: number
    discount: number
    total: number
  }
  giftWrapFee: number
  totalAmount: number
  couponCode?: string
  giftWrap: boolean
   status: string
   actions?: IOrderAction[]
images?: string[] | { url: string; uploadedAt: Date }[]
      deliveryStatus: string // Added this
  estimatedDelivery: string
 deliveryTier: DeliveryTier
 reason?: string
  createdAt: string
  updatedAt: string
  trackingId?: string
  courierName?: string
  deliveryDate?: string
  paymentMethod?: string
  transactionId?: string
}

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  step: number
}> = {
  pending: {
    label: "Order Placed",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock size={14} />,
    step: 0,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <CheckCircle2 size={14} />,
    step: 1,
  },
  shipped: {
    label: "Shipped",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: <Package size={14} />,
    step: 2,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: <Truck size={14} />,
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: <CheckCircle2 size={14} />,
    step: 4,
  },
 
  exchange_requested: {
    label: "Exchange Requested",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <RefreshCw size={14} />,
    step: 5,
  },
  returned: {
    label: "Returned",
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
    icon: <RotateCcw size={14} />,
    step: 6,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <X size={14} />,
    step: -1,
  },
}
const TRACK_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: "pending",          label: "Order Placed",      icon: <Clock size={16} /> },
  { key: "confirmed",        label: "Confirmed",         icon: <CheckCircle2 size={16} /> },
  { key: "shipped",          label: "Shipped",           icon: <Package size={16} /> },
  { key: "out_for_delivery", label: "Out for Delivery",  icon: <Truck size={16} /> },
  { key: "delivered",        label: "Delivered",         icon: <Home size={16} /> },
]

// ─── Helper Functions ──────────────────────────────────────────────────────

function normalizeStatus(order: any): OrderStatus {
  if (!order) return 'pending';
  
  // Use optional chaining and default to empty string
  const status = (order.status || "").toUpperCase();
  const delivery = (order.deliveryStatus || "").toUpperCase();

  // 1. Terminal/Priority States (Cancel/Return)
  if (status === "CANCELLED" || status === "FAILED") return "cancelled";
  const normalizeStatus = (order: Order) => {
  if (order.ticketCount && order.ticketCount > 0) {
    return "support"; // or custom label
  }
  return order.status.toLowerCase();
};
  if (status === "EXCHANGE_REQUESTED") return "exchange_requested";
  if (status === "RETURNED") return "returned";

  // 2. Map Granular Delivery Status (The "Live" Tracking)
  if (delivery === "DELIVERED") return "delivered";
  if (delivery === "OUT_FOR_DELIVERY") return "out_for_delivery";
  if (delivery === "SHIPPED") return "shipped";
  
  // 3. Fallback to high-level Status (The "Financial" state)
  if (status === "SHIPPED") return "shipped";
  if (status === "DELIVERED") return "delivered";
  
  if (status === "PAID") return "confirmed";
  return 'pending';
}

function getStatusConfig(order: any) {
  const normalizedStatus = normalizeStatus(order)
  return STATUS_CONFIG[normalizedStatus]
}

function getOrderPaymentDisplay(order: Order, isMockEnabled: boolean) {
  if (isMockEnabled) {
    return {
      method: "MOCK",
      status: "PAID",
      isCod: false,
      isMock: true,
      displayLabel: "Mock Paid",
      transactionId: "MOCK-TXN",
    }
  }

  const method = (order.paymentMethod || "ONLINE").toUpperCase()
  const status = (order.status || "PENDING").toUpperCase() === "PAID" ? "PAID" : "PENDING"

  return {
    method,
    status,
    isCod: method === "COD",
    isMock: false,
    displayLabel: method === "COD" ? "Pay on Delivery" : "Paid Online",
    transactionId: order.transactionId,
  }
}

function getDiscountedLineTotal(order: Order, item: OrderItem): number {
  const snapshotFinalPrice = Number(item.finalPrice ?? item.price ?? 0)
  const quantity = Number(item.quantity ?? 0)
  if (snapshotFinalPrice > 0) {
    return Math.max(0, Math.round(snapshotFinalPrice * quantity))
  }

  const baseLineTotal = Math.max(0, (item.price || 0) * quantity)
  const baseSubtotal = (order.items || []).reduce(
    (sum, orderItem) => sum + Math.max(0, (orderItem.price || 0) * (orderItem.quantity || 0)),
    0
  )

  if (baseSubtotal <= 0) return baseLineTotal

  const orderSubtotal = Number.isFinite(order.subtotal) ? order.subtotal : baseSubtotal
  const orderDiscount = Number.isFinite(order.discount) ? order.discount : 0
  const discountedSubtotal = Math.max(0, orderSubtotal - orderDiscount)

  if (discountedSubtotal >= baseSubtotal) return baseLineTotal

  const ratio = discountedSubtotal / baseSubtotal
  return Math.round(baseLineTotal * ratio)
}



// ─── Tracking Timeline ────────────────────────────────────────────────────

function TrackingTimeline({ order }: { order: Order }) {
 const normalizedStatus = normalizeStatus(order);
  
 if (normalizedStatus === "cancelled") {
  return (
    <div className="space-y-4">

      {/* Cancel notice */}
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
        <AlertCircle size={15} />
        Order cancelled. Refund is being processed.
      </div>

      {/* Refund timeline */}
      <div className="space-y-3">

        <div className="flex items-center gap-3">
          <CheckCircle2 size={16} className="text-green-500" />
          <span className="text-sm font-semibold text-gray-800">
            Order Cancelled
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Clock size={16} className="text-orange-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-800">
            Refund Processing
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Circle size={16} className="text-gray-300" />
          <span className="text-sm text-gray-400">
            Refund Completed
          </span>
        </div>

      </div>
    </div>
  )
}
const steps = [
    { key: "pending",          label: "Order Placed",      icon: <Clock size={16} /> },
    { key: "confirmed",        label: "Confirmed",         icon: <CheckCircle2 size={16} /> },
    { key: "shipped",          label: "Shipped",           icon: <Package size={16} /> },
    { key: "out_for_delivery", label: "Out for Delivery",  icon: <Truck size={16} /> },
    { key: "delivered",        label: "Delivered",         icon: <Home size={16} /> },
  ];

 
   if (normalizedStatus === "exchange_requested") {
    steps.push({ key: "exchange_requested", label: "Exchange Process", icon: <RefreshCw size={16} /> });
  }

  const currentStep = STATUS_CONFIG[normalizedStatus].step


  return (
    <div className="relative">
      {/* connecting line */}
      <div className="absolute left-[22px] top-5 bottom-5 w-0.5 bg-gray-100 z-0" />

      <div className="space-y-1">
        {TRACK_STEPS.map((s, i) => {
          const done    = i < currentStep
          const active  = i === currentStep
          const pending = i > currentStep

          return (
            <div key={s.key} className="relative flex items-start gap-4 z-10">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                done    ? "bg-pink-600 border-pink-600 text-white" :
                active  ? "bg-gray-900 border-gray-900 text-white ring-4 ring-gray-100" :
                          "bg-white border-gray-200 text-gray-300"
              }`}>
                {done ? <CheckCircle2 size={16} strokeWidth={2.5} /> : s.icon}
              </div>

              <div className="flex-1 py-2.5">
                <p className={`text-sm font-bold ${active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-300"}`}>
                  {s.label}
                </p>
                {active && (
                  <p className="text-xs text-pink-600 font-medium mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block animate-pulse" />
                    Current status
                  </p>
                )}
                {done && s.key === "delivered" && order.deliveryDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────

function OrderCard({ order, setOrders }: { 
  order: Order
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
}) {
  const [expanded, setExpanded]       = useState(false)
  const [reviewItem, setReviewItem]   = useState<OrderItem | null>(null)
  const [downloading, setDownloading] = useState<'invoice' | 'transaction' | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
const [reason, setReason] = useState("")
 const { data: session } = useSession(); 
 const itemCount = order.items?.length ?? 0;
const [images, setImages] = useState<File[]>([])
const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [processing, setProcessing] = useState(false);
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMockEnabled = ENABLE_MOCK_PAYMENT || searchParams.get("mockPayment") === "1"
  const normalizedStatus = normalizeStatus(order); // Pass whole order
  const cfg = STATUS_CONFIG[normalizedStatus];
  const date                          = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })
  const paymentView = getOrderPaymentDisplay(order, isMockEnabled)
 const latestTicket = order.latestTicket || 
                     order.supportTickets?.[order.supportTickets.length - 1];
const [subject, setSubject] = useState("");
const [description, setDescription] = useState("");
const [supportIssue, setSupportIssue] = useState("");
const signatureCacheRef = useRef<{
  timestamp: number
  signature: string
  cloudName: string
  apiKey: string
  fetchedAt: number
} | null>(null)
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])

  if (!files.length) return

  const newPreviews = files.map(file => URL.createObjectURL(file))

  setImages(prev => [...prev, ...files])
  setPreviewUrls(prev => [...prev, ...newPreviews])
}
const removeImage = (index: number) => {
  setImages(prev => prev.filter((_, i) => i !== index))
  setPreviewUrls(prev => prev.filter((_, i) => i !== index))
}
const uploadToCloudinary = async (file: File): Promise<string> => {
  const cached = signatureCacheRef.current
  let signaturePayload = cached

  if (!signaturePayload || Date.now() - signaturePayload.fetchedAt > 45_000) {
    const sigRes = await fetch("/api/cloudinary-signature")
    const sigJson = await sigRes.json()
    signaturePayload = {
      timestamp: Number(sigJson.timestamp),
      signature: String(sigJson.signature || ""),
      cloudName: String(sigJson.cloudName || ""),
      apiKey: String(sigJson.apiKey || ""),
      fetchedAt: Date.now(),
    }
    signatureCacheRef.current = signaturePayload
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signaturePayload.apiKey);
  formData.append("timestamp", String(signaturePayload.timestamp));
  formData.append("signature", signaturePayload.signature);
  formData.append("folder", "orders");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data.secure_url; // ✅ MUST return string
};
const handleSupportTicket = async (
  reason?: string,
  files?: File[],
  subject?: string,
  description?: string
) => {
  setProcessing(true);

  try {
    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      imageUrls = await Promise.all(
        files.map(file => uploadToCloudinary(file))
      );
    }

    const payload = {
      subject: subject || `Support Request: ${order.orderNumber}`,
      description: description || reason || "No description provided",
      orderNumber: order.orderNumber,
      userId: session?.user?.id || session?.user?.email || "GUEST_USER",
      images: imageUrls.map(url => ({ url })),
    };
// 🔍 DEBUG LOG
console.log("📩 Sending Support Ticket Payload:", payload);
    const res = await fetch("/api/supportticket", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
setTicketNumber(data.ticketNumber);
    if (!res.ok) {
      throw new Error(data.error || "Failed to create ticket");
    }
setOrders(prev =>
      prev.map(o =>
        o.orderNumber === order.orderNumber
          ? {
              ...o,
              // Append the new ticket to the existing supportTickets array
              supportTickets: [
                ...(o.supportTickets || []),
                {
                  _id: data._id, // Ensure your API returns the new ID
                  ticketNumber: data.ticketNumber,
                  status: data.status || "open",
                  createdAt: new Date().toISOString(),
                  
                }
              ],
              // Increment ticket count if you use it for logic
              ticketCount: (o.ticketCount || 0) + 1
            }
          : o
      )
    );
     toast.custom(t => (
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg transition ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <CheckCircle2 className="text-green-500" size={20} />
        <span className="text-sm font-medium text-gray-800">
        {`Ticket Created 🎫 #${data.ticketNumber}`}
        </span>
      </div>
    ))

  } catch (error) {
    console.error(error);
    toast.error("Support request failed ❌");
  } finally {
    setProcessing(false);
  }
};
  const handleOrderUpdate = async (
  newStatus: string,
  reason?: string,
  files?: File[]
) => {
  if (!newStatus) return;

  const status = newStatus.toUpperCase();
  setProcessing(true);

  try {
    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      imageUrls = await Promise.all(
        files.map(file => uploadToCloudinary(file))
      );
    }

    const orderPayload = {
      status,
      reason,
      images: imageUrls,
    };
// 🔍 DEBUG LOG
console.log("📦 Sending Order Update Payload:", orderPayload);
    const orderRes = await fetch(`/api/orders/${order.orderNumber}`, {
      method: "PATCH",
      body: JSON.stringify(orderPayload),
      headers: { "Content-Type": "application/json" },
    });

    if (!orderRes.ok) {
      const err = await orderRes.json();
      throw new Error(err?.error || "Failed to update order");
    }

   const orderData = await orderRes.json();
console.log("📦 Incoming updated order:", orderData);
setOrders(prev =>
  prev.map(o =>
    o.orderNumber === order.orderNumber
      ? { ...orderData.order, latestTicket: orderData.latestTicket }
      : o
  )
);
setTicketNumber(orderData.latestTicket?.ticketNumber || null);
    // ─── 5️⃣ Show success toast ────────────────────────────────────────
    toast.custom(t => (
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg transition ${
          t.visible ? "animate-enter" : "animate-leave"
        }`}
      >
        <CheckCircle2 className="text-green-500" size={20} />
        <span className="text-sm font-medium text-gray-800">
          Order updated successfully ✅
        </span>
      </div>
    ))

  } catch (error) {
    console.error("Error in handleStatusUpdate:", error)
    toast.error("Failed to update order or create ticket ❌")
  } finally {
    setProcessing(false)
  }
}

   const handleDownloadInvoice = async () => {
    if (!order.orderNumber) return
    setDownloading('invoice')
    try {
      const res = await fetch(`/api/invoice/${order.orderNumber}`)
      if (!res.ok) throw new Error("Failed to download invoice")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download invoice. Please try again.')
    } finally {
      setDownloading(null)
    }
  }
  // ── Download transaction
  const handleDownloadTransaction = async () => {
    if (!order.orderNumber) return
    setDownloading('transaction')
    try {
      const res = await fetch(`/api/transection/${order.orderNumber}`)
      if (!res.ok) throw new Error("Failed to download transaction details")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transaction-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download transaction details. Please try again.')
    } finally {
      setDownloading(null)
    }
  }
  return (
    <>
    {processing && <Loader />}
      

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── Card Header ── */}
        <div
          className="px-5 py-4 flex flex-wrap gap-3 items-center justify-between cursor-pointer hover:bg-gray-50/60 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <Package size={17} className="text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>  
    <p className="text-xs text-gray-400 mt-0.5"> {date} · {itemCount} item{itemCount !== 1 ? "s" : ""}</p>
  </div>
          </div>

          <div className="flex items-center gap-3">
            {/* --- NEW PAID BADGE --- */}
 {paymentView.status === "PAID" && !paymentView.isCod && (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
    <CheckCircle2 size={12} className="stroke-[3]" />
    <span className="text-[10px] font-black uppercase tracking-wider">{paymentView.isMock ? "MOCK PAID" : "PAID"}</span>
  </div>
)}
{latestTicket && (
  <div className="flex items-center text-xs gap-1 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
    <span className="font-semibold stroke-[3]">{latestTicket.ticketNumber}</span> – {latestTicket.status}
  </div>
)}
<div
  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${
    paymentView.isCod
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"
  }`}
>
  {paymentView.isCod ? (
    <>
      <Clock size={12} className="stroke-[3]" />
      Pay on Delivery
    </>
  ) : (
    <>
      <CheckCircle2 size={12} className="stroke-[3]" />
      {paymentView.displayLabel}
    </>
  )}
</div>       <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="font-black text-gray-900">{formatINR(order.pricingDisplay?.total ?? order.totalAmount)}</span>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>

       {/* ── Items List (Source of Truth) ── */}
<div className="divide-y divide-gray-50" onClick={() => setExpanded(e => !e)}>
  {order.items.map((item, i) => (
    <div key={i} className="px-5 py-4 flex gap-4 items-center">
      {/* Product Image */}
      <div
  className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50 cursor-pointer"
  onClick={() => router.push(`/products/${item.productId}`)} // ✅ redirect
>
  <Image 
    src={item.image || "/images/No_Image_Available.jpg"} 
    alt={item.title} 
    fill
    sizes="64px"
    className="object-cover"
    onError={(e) => {
      const target = e.target as HTMLImageElement
      target.src = "/images/No_Image_Available.jpg"
    }}
  />
</div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 line-clamp-1">{item.title}</p>
            {/* ✅ Show discount badge for discounted products */}
            {(item.discountPercent ?? 0) > 0 && (
              <span className="inline-flex text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded mt-1">
                {item.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
        {(() => {
          const qty = Math.max(1, Number(item.quantity ?? 1))
          const lineFinal = Math.max(0, Number(item.displayLineTotal ?? getDiscountedLineTotal(order, item)))
          const lineOriginal = Math.max(0, Number(item.displayOriginalLineTotal ?? lineFinal))
          const unitFinal = Math.round(lineFinal / qty)
          const unitOriginal = Math.round(lineOriginal / qty)
          const lineSaved = Math.max(0, lineOriginal - lineFinal)
          const hasDiscount = (item.discountPercent ?? 0) > 0 || lineSaved > 0

          return (
            <div className="mt-1 space-y-1">
              <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>{formatINR(lineFinal)}</span>
                {hasDiscount && lineOriginal > lineFinal && (
                  <span className="text-xs text-gray-400 line-through">{formatINR(lineOriginal)}</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-x-3 text-[11px] text-gray-500 text-right">
                {hasDiscount && unitOriginal > unitFinal && (
                  <span className="line-through whitespace-nowrap">MRP: {formatINR(unitOriginal)}</span>
                )}
                {hasDiscount && lineSaved > 0 ? (
                  <span className="text-green-600 font-semibold whitespace-nowrap">Saved: {formatINR(lineSaved)}</span>
                ) : (
                  <span className="whitespace-nowrap">Qty x {qty}</span>
                )}
              </div>
            </div>
          )
        })()}
      </div>

    </div>
  ))}
</div>

{/* ── Expanded Content (Details only, NO duplicate images) ── */}
{expanded && (
 <div className="px-5 pb-5 grid sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50">

             {/* ── Tracking Section ── */}
<div className="flex flex-col">
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
    Order Journey
  </p>
  
  {/* Pass the whole order object to ensure the timeline has all the data it needs */}
  <TrackingTimeline order={order} />

{order.reason && (
  <div className="mt-4 flex items-start gap-2 p-3 rounded-xl border bg-orange-50 border-orange-100">
    <AlertCircle size={14} className="text-orange-500 mt-0.5" />
    <div className="text-xs text-gray-700 leading-relaxed">
      <span className="font-semibold text-gray-800">
        {order.status === "CANCELLED" && "Cancellation Reason:"}
        {order.status === "EXCHANGE_REQUESTED" && "Exchange Reason:"}
      </span>{" "}
      {order.reason}
    </div>
  </div>
)}

{order.actions && order.actions.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
   
    {order.actions
      .filter(action => action.images && action.images.length > 0)
      .map((action, actionIdx) =>
        action.images!.map((img, imgIdx) => {
          if (!img) return null; // ✅ Type guard

          const src = typeof img === "string" ? img : img.url;

          return (
            <div key={`${actionIdx}-${imgIdx}`} className="relative group">
              <img
                src={src}
                alt={`Action ${actionIdx + 1} Evidence ${imgIdx + 1}`}
                className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                onClick={() => window.open(src, "_blank")} 
              />
            </div>
          );
        })
      )}
  </div>
)}
  {/* Only show tracking details if a tracking ID actually exists */}
  {order.trackingId && (
    <div className="mt-6 flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
        <Truck size={14} className="text-pink-500" />
        <span>SHIPPING DETAILS</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400 font-medium">{order.courierName}</span>
        <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
          {order.trackingId}
        </span>
      </div>
    </div>
  )}
</div>

              {/* Delivery & Price breakdown */}
              <div className="space-y-5">
                {/* Address */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Delivery Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{order.address.name}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                        {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} – {order.address.pincode}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{order.address.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Price Breakdown</p>
                  {(() => {
                    const displaySubtotal = order.pricingDisplay?.subtotal ?? order.subtotal
                    const displayDiscount = order.pricingDisplay?.discount ?? order.discount
                    const displayTotal = order.pricingDisplay?.total ?? order.totalAmount
                    const displayDiscountPercent = displaySubtotal > 0
                      ? Math.round((displayDiscount / displaySubtotal) * 100)
                      : 0
                    const shippingCharge = Math.max(0, Math.round(order.shipping ?? 0))
                    const handlingBreakdown = splitHandlingCharge(shippingCharge)
                    return (
                  <div className="space-y-1.5 text-sm">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Products</p>
                      {order.items.map((item, index) => {
                        const qty = Math.max(1, Number(item.quantity ?? 1))
                        const lineFinal = Math.max(0, Number(item.displayLineTotal ?? getDiscountedLineTotal(order, item)))
                        const lineOriginal = Math.max(0, Number(item.displayOriginalLineTotal ?? lineFinal))
                        const itemSaved = Math.max(0, lineOriginal - lineFinal)
                        return (
                          <div key={`${item.productId}-${index}`} className="border-t border-gray-200 first:border-t-0 pt-2 first:pt-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                                <p className="text-[11px] text-gray-500">Qty: {qty}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-900">{formatINR(lineFinal)}</p>
                                {lineOriginal > lineFinal && (
                                  <p className="text-[11px] text-gray-400 line-through">{formatINR(lineOriginal)}</p>
                                )}
                              </div>
                            </div>
                            {itemSaved > 0 && (
                              <div className="flex justify-between text-[11px] text-green-600 mt-1">
                                <span>Item Discount</span>
                                <span className="font-semibold">−{formatINR(itemSaved)}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span><span className="font-semibold text-gray-900">{formatINR(displaySubtotal)}</span>
                    </div>
                    {displayDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          Discount{displayDiscountPercent > 0 ? ` (${displayDiscountPercent}%)` : ""}
                          {order.couponCode ? ` (${order.couponCode})` : ""}
                        </span>
                        <span className="font-semibold">−{formatINR(displayDiscount)}</span>
                      </div>
                    )}
                    
                   {(() => {
  const tier = order.deliveryTier ?? "STANDARD"
  const tierText = deliveryLabels[tier] ?? tier

  if (shippingCharge === 0) {
    return (
      <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
        {tierText} delivery is Free.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-gray-600">
        <span className="flex items-center gap-2">
          <Truck size={16} className="text-pink-600" />
          Delivery {tierText}
        </span>
        <span className="font-semibold text-gray-900">{formatINR(shippingCharge)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Packaging Charges</span>
        <span className="font-semibold text-gray-900">{formatINR(handlingBreakdown.packagingCharge)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Handling Fee</span>
        <span className="font-semibold text-gray-900">{formatINR(handlingBreakdown.handlingFee)}</span>
      </div>
    </div>
  )
})()}
                    {order.giftWrapFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Gift Wrap</span><span className="font-semibold text-gray-900">{formatINR(order.giftWrapFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5 border-t border-gray-100 font-bold text-gray-900">
                      <span>Total</span><span>{formatINR(displayTotal)}</span>
                    </div>
                  </div>
                    )
                  })()}
                </div>

                {/* Payment Info */}
                {order.paymentMethod && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-semibold">{paymentView.method}</span>
                      <span className="text-gray-500">• {paymentView.status}</span>
                      {paymentView.transactionId && (
                        <span className="text-gray-400">• ID: {paymentView.transactionId}</span>
                      )}
                    </div>
                  </div>
                )}

              <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-50 mt-4">
  {/* CANCEL BUTTON */}
{(normalizedStatus === "pending" || normalizedStatus === "confirmed") && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      setActionType("cancelled")
    }}
    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
  >
    <X size={12} />
    Cancel Order
  </button>
)}

{/* RETURN / EXCHANGE */}
{normalizedStatus === "delivered" && (
  <>

    <button
      onClick={(e) => {
        e.stopPropagation()
        setActionType("exchange_requested")
      }}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-pink-300 hover:text-pink-600"
    >
      <RefreshCw size={12} /> Exchange/Return
    </button>
  </>
)}


{actionType && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">

    <div className="
  bg-white backdrop-blur-xl 
  w-full max-w-md 
  rounded-2xl 
  shadow-[0_20px_60px_rgba(0,0,0,0.15)]
  border border-gray-100 
  relative overflow-hidden
">

      {/* CLOSE */}
      <button
        onClick={() => {
          setActionType(null)
          setReason("")
          setImages([])
          setPreviewUrls([])
        }}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
      >
        <X size={16} />
      </button>

      {/* HEADER */}
      <div className="px-5 pt-2 py-6 pb-2 border-b">
       <h3 className="text-lg font-semibold tracking-tight text-gray-900">
          {actionType === "cancelled" && "Cancel Order"}
          {actionType === "exchange_requested" && "Exchange / Return"}
        </h3>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Tell us why you're requesting this
        </p>
      </div>

      {/* BODY */}
      <div className="px-6 py-5 space-y-5">

        {/* ✅ CANCEL REASONS */}
        {actionType === "cancelled" && (
          <div className="grid gap-2">
            {[
              "Ordered by mistake",
              "Found a better price",
              "Delivery taking too long",
              "Not needed anymore",
            ].map((option) => (
              <button
                key={option}
                onClick={() => setReason(option)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
${
  reason === option
    ? "border-black bg-black text-white shadow-sm"
    : "border-black-200 text-gray-700 hover:border-black hover:bg-gray-50"
}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* ✅ EXCHANGE REASONS */}
        {actionType === "exchange_requested" && (
        <div className="grid gap-2">
  {[
    "Wrong size received",
    "Wrong product delivered",
    "Damaged product",
    "Quality not as expected",
  ].map((option) => (
    <button
      key={option}
      onClick={() => setReason(option)}
      className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
        ${
          reason === option
            ? "border-blue-500 bg-linear-to-r from-blue-300 to-blue-100 text-gray-900 shadow-md"
            : "border-gray-300 bg-white hover:bg-linear-to-r hover:from-pink-50 hover:to-yellow-50 text-gray-700"
        }`}
    >
      {option}
    </button>
  

            ))}
          </div>
        )}

        {/* ✅ IMAGE UPLOAD */}
        {actionType === "exchange_requested" && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Upload images (optional)
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer hover:border-black hover:bg-gray-100">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-xs text-gray-500">
                Click to upload
              </span>
            </label>

            {/* PREVIEW */}
            {previewUrls.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previewUrls.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 bg-black text-white rounded-full p-1"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMENT */}
        <textarea
          placeholder="Additional details..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm h-24"
        />

      </div>

      {/* FOOTER */}
      <div className="px-6 pb-6 flex justify-end">
      <button
  onClick={() => {
    handleOrderUpdate(actionType!, reason, images);
    setActionType(null);
  }}
  disabled={processing} // prevents multiple clicks
  className={`
    relative px-5 py-2.5 text-sm font-semibold text-white 
    rounded-xl overflow-hidden
    bg-linear-to-r from-black via-gray-900 to-black
    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
    hover:shadow-[0_10px_25px_rgba(0,0,0,0.35)]
    active:scale-[0.97]
    transition-all duration-200
    ${processing ? "cursor-not-allowed opacity-70" : ""}
  `}
>
  <span className="relative z-10 flex items-center gap-2 justify-center">
    {processing ? "Updating..." : (
      <>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Submit Request
      </>
    )}
  </span>

  {/* Shine effect */}
  <span className="
    absolute inset-0 opacity-0 hover:opacity-100
    bg-linear-to-r from-transparent via-white/20 to-transparent
    transition duration-500
  "></span>
</button>
      </div>

    </div>
  </div>
)}
  <button 
  onClick={(e) => { e.stopPropagation(); handleDownloadInvoice() }}
  disabled={downloading === 'invoice' || order.status === "CANCELLED"}
  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border rounded-lg transition-all
  ${
    order.status === "CANCELLED"
      ? "border-gray-200 text-gray-400 cursor-not-allowed"
      : "border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600"
  }`}
>
  {downloading === 'invoice'
    ? <Loader2 size={12} className="animate-spin" />
    : <Download size={12} />
  }
  Invoice
</button>
                   <button 
    onClick={(e) => { e.stopPropagation(); handleDownloadTransaction() }}
    disabled={downloading === 'transaction'}
    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50/30 transition-all disabled:opacity-50"
  >
    {downloading === 'transaction' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
    Transaction Details
  </button>
 {!order.supportTickets?.some(ticket => ticket.status === "open") && (
 <button
  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border rounded-lg transition
    ${latestTicket?.status === "open"
      ? "border-gray-200 text-gray-400 cursor-not-allowed"
      : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-pink-600"
    }`}
  onClick={(e) => {
    e.stopPropagation();
    // Only allow opening support modal if no open ticket
    if (latestTicket?.status === "open") return;
    setActionType("support");
    setReason(""); // reset reason
    setSupportIssue("");
  }}
  disabled={latestTicket?.status === "open"}
>
  <MessageSquare size={12} /> Support
</button>
)}
</div>
{actionType === "support" && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Customer Support</h3>
          <p className="text-xs text-gray-500">How can we help you with this order?</p>
        </div>
        <button onClick={() => setActionType(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Issue Selection */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Select Issue</label>
          <select
            value={supportIssue}
            className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
            onChange={(e) => setSupportIssue(e.target.value)}
          >
            <option value="">Choose an issue...</option>
            <option value="Delivery Issue">Delivery Delay</option>
            <option value="Payment Issue">Payment/Refund Query</option>
            <option value="Quality Issue">Product Quality</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Message Input */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Message</label>
          <textarea
            placeholder="Describe your issue in detail..."
            className="w-full p-3 rounded-xl border border-gray-200 text-sm h-28 resize-none focus:ring-2 focus:ring-pink-500 outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Image Upload (Reusing your logic) */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Upload Evidence (Photos)</label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <UploadCloud size={24} className="text-gray-400 mb-1" />
            <span className="text-[10px] text-gray-500">PNG, JPG up to 5MB</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          {/* Preview Row */}
          {previewUrls.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {previewUrls.map((src, i) => (
                <div key={src} className="relative shrink-0">
                  <img src={src} className="w-14 h-14 object-cover rounded-lg border" alt="preview" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-gray-50 flex gap-3">
        <button 
          onClick={() => setActionType(null)}
          className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={!reason || processing}
         onClick={async () => {
  const ticketSubject = supportIssue
    ? `Support Request (${supportIssue}) - ${order.orderNumber}`
    : subject;
  await handleSupportTicket(reason, images, ticketSubject, reason);
  setActionType(null); // close modal
  setSupportIssue("");
}}
          className="flex-1 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-pink-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {processing ? <Loader2 size={16} className="animate-spin" /> : "Send Request"}
        </button>
      </div>
    </div>
  </div>
)}
              </div>
            </div>
)}
          </div>

    </>
  )
}


            {/* Two-column: tracking + info */}
            

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyOrders() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-32 h-32 rounded-full bg-linear-to-br from-pink-50 to-rose-100 flex items-center justify-center mb-6">
        <ShoppingBag size={52} className="text-pink-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">No orders yet</h2>
      <p className="text-gray-500 max-w-xs mb-7 text-sm leading-relaxed">
        Your order history will appear here once you place your first order.
      </p>
      <Link href="/products"
        className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-pink-600 transition-all duration-300 shadow-lg"
      >
        Start Shopping <ChevronRight size={17} />
      </Link>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState("")
  const [search,       setSearch]       = useState("")
  
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all")
  const [refreshing,   setRefreshing]   = useState(false)

  // Redirect to home if user not logged in
  useEffect(() => {
    if (session === null) { // specifically null, not just falsy
      router.push("/")
    }
  }, [session, router])

const fetchOrders = async (silent = false) => {
  if (!silent) setLoading(true)
  else setRefreshing(true)
  setError("")

  try {
    const res = await fetch("/api/orders")
    if (!res.ok) throw new Error("Failed to load orders")
    
    const data: Order[] = await res.json()

    // Debug: log the fetched orders properly
    console.log("Fetched orders:", data)
    console.table(data) // optional: nicely formatted table in console
  console.log("Order IDs:", data.map(o => o.id))
    // Update state so the component re-renders with the orders
    setOrders(data)

  } catch (err) {
    console.error('Failed to fetch orders:', err)
    setError("Could not load your orders. Please try again.")
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}
  useEffect(() => { 
    // Only fetch orders if user is authenticated
    if (session) { 
      fetchOrders() 
    }
  }, [session])

  const filtered = orders.filter(o => {
   const normalizedStatus = normalizeStatus(o);
   const matchStatus = filterStatus === "all" || normalizedStatus === filterStatus;
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some(i => i.title.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const normalizedStatus = normalizeStatus(o)
    acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-pink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package size={22} className="text-pink-600" strokeWidth={2} />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Orders</h1>
            {orders.length > 0 && (
              <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {orders.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw size={16} className={`text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/products" className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1 transition-colors">
              Shop More <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <>
            {/* ── Search & Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order ID or product..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-400"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Status filter pills */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: "all",              label: "All" },
                  { key: "pending",          label: "Placed" },
                  { key: "confirmed",        label: "Confirmed" },
                  { key: "shipped",          label: "Shipped" },
                  { key: "out_for_delivery", label: "Out for Delivery" },
                  { key: "delivered",        label: "Delivered" },
                  { key: "cancelled",        label: "Cancelled" },
                ] as const).map(({ key, label }) => {
                  const count = key === "all" ? orders.length : (statusCounts[key] || 0)
                  if (key !== "all" && count === 0) return null
                  return (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        filterStatus === key
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        filterStatus === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={15} /> {error}
                <button onClick={() => fetchOrders()} className="ml-auto text-xs font-semibold underline">Retry</button>
              </div>
            )}

<Toaster
  position="top-center"
  toastOptions={{
    style: {
      marginTop: "40vh",   // pushes toast to center
    },
  }}
/>
            {/* ── Orders list ── */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search size={36} className="text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 font-medium">No orders match your filter.</p>
                <button onClick={() => { setSearch(""); setFilterStatus("all") }}
                  className="mt-4 text-sm text-pink-600 hover:underline font-semibold"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((order, idx) => {
                  // Ensure key is always defined and unique
                  const key =
                    (order.id ? order.id : '') +
                    (order.updatedAt ? order.updatedAt : '') +
                    (order.orderNumber ? order.orderNumber : '') +
                    (order.createdAt ? order.createdAt : '') +
                    idx;
                  return (
                    <OrderCard
                      key={key}
                      order={order}
                      setOrders={setOrders}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}