"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getProducts } from "@/lib/apiserver"
import {useRouter, useSearchParams} from "next/navigation"
import { Wrench } from "lucide-react"
import { Heart,Sparkles,Award,TrendingUp,Tag, Bot, SendHorizontal, Ticket, Loader2 } from "lucide-react"
import { ShopProvider,useShop } from "@/app/context/ShopContext"
import BulkInquiryModal from "@/components/BulkInquiryModal"
import { getCatalogEffectivePrice, getCatalogOriginalEffectivePrice, getCatalogDiscountAmount, getCatalogDiscountPercent } from "@/lib/pricing"
// --- CONSTANTS ---
const SLIDES = [
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
  "https://images.unsplash.com/photo-1587614382346-4ec70e388b28",
  "https://images.unsplash.com/photo-1518779578993-ec3579fee39f"
];
type ProductTag = "NEW" | "BEST_SELLER" | "TRENDING" | "DEFAULT";

const TAG_CONFIG: Record<ProductTag, { label: string; color: string; Icon: any }> = {
  NEW: { label: "NEW", color: "bg-green-500", Icon: Sparkles },
  BEST_SELLER: { label: "BEST SELLER", color: "bg-blue-500", Icon: Award },
  TRENDING: { label: "TRENDING", color: "bg-purple-500", Icon: TrendingUp },
  DEFAULT: { label: "SALE", color: "bg-gray-400", Icon: Tag },
};
const CARE_STEPS = [
  {
    title: "ESD Protected Lab",
    desc: "We use grounded anti-static mats to protect sensitive CMOS circuits from static death.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.472a11.956 11.956 0 01-8.618-3.04m17.236 0a11.956 11.956 0 01-8.618 3.04" />
      </svg>
    )
  },
  {
    title: "Micro-Soldering",
    desc: "Precision restoration of burnt traces and BGA chips using factory-grade equipment.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    )
  },
  {
    title: "Thermal Management",
    desc: "Old thermal paste is replaced with high-performance liquid metal or silver compound.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }
];
const BUDGET_CATEGORIES = [
  {
    title: "BUDGET FRIENDLY",
    priceTag: "UNDER ₹9999",
    minPrice: 0,
    maxPrice: 9999,
    description: "Great for students & basic use",
    colorClass: "bg-cyan-500",
    hoverColor: "group-hover:bg-cyan-600",
    textColor: "text-cyan-500"
  },
  {
    title: "MID-RANGE VALUE",
    priceTag: "UNDER ₹14999",
    minPrice: 10000,
    maxPrice: 14999,
    description: "Perfect balance of price & performance",
    colorClass: "bg-sky-500",
    hoverColor: "group-hover:bg-sky-600",
    textColor: "text-sky-500"
  },
  {
    title: "PREMIUM EXPERIENCE",
    priceTag: "UNDER ₹19999",
    minPrice: 15000,
    maxPrice: 19999,
    description: "Top-tier devices for pros & creators",
    colorClass: "bg-emerald-500",
    hoverColor: "group-hover:bg-emerald-600",
    textColor: "text-emerald-500"
  },
  {
    title: "ULTIMATE CHOICE",
    priceTag: "ABOVE ₹20000",
    minPrice: 20000,
    maxPrice: null,
    description: "High-end power for ultimate productivity",
    colorClass: "bg-slate-700",
    hoverColor: "group-hover:bg-slate-800",
    textColor: "text-slate-700"
  }
];
const CATEGORIES = [
  { name: "Laptops", category: "laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8" },
  { name: "Desktops", category: "desktops", image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87" },
  { name: "Mini PC", category: "mini pc", image: "https://images.unsplash.com/photo-1591405351990-4726e331f141" },
  { name: "ChromeBook", category: "chromebook", image: "https://images.unsplash.com/photo-1589561084283-930aa7b1ce50" },
  { name: "All in One", category: "all in one", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" },
  { name: "Accessories", category: "accessories", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46" },
];

const REFURBISHED_PRODUCTS = [
  { id: 1, name: "Refurbished Dell Laptop", discount: 24, originalPrice: 26999, price: 18999, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8" },
  { id: 2, name: "HP Business Laptop", discount: 28, originalPrice: 24999, price: 22499, image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28" },
  { id: 3, name: "Gaming Desktop PC", discount: 22, originalPrice: 45999, price: 35999, image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45" },
  { id: 4, name: "Lenovo ThinkPad", discount: 19, originalPrice: 29999, price: 20999, image: "https://images.unsplash.com/photo-1518770660439-4636190af475" },
];

const REPAIR_SERVICES = [
  "Laptop Screen Repair", "Hardware Upgrades & SSD Installation", "Virus Removal & Software Fix",
  "Keyboard & Battery Replacement", "Desktop PC Repair", "Data Recovery Services"
];

const FAQS = [
  { q: "Why Choose Refurbished Laptops?", a: "Choosing refurbished saves money and reduces e-waste without compromising on performance." },
  { q: "What are some benefits of buying a refurbished laptop from MTS Service?", a: "You get up to 70% off retail prices, a 40-point quality check, and a 1-year warranty." },
  { q: "How do we know about the support and warranty services at MTS Service?", a: "We provide dedicated customer support and a centralized warranty tracking system for all buyers." },
  { q: "How do I Return or Cancel an Order?", a: "Returns are easy through our portal within the first 7 days of delivery." }
];

const BULK_INQUIRY_SEEN_KEY = "mts_bulk_inquiry_seen_session_v1"

function HomePageContent() {
  const [openChat, setOpenChat] = useState(false);
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<Array<{ role: "bot" | "user"; text: string }>>([
    { role: "bot", text: "Hi, I am MTS AI Support. I can help with repair booking, order tracking, warranty, and support tickets." }
  ])
  const [ticketFormOpen, setTicketFormOpen] = useState(false)
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    orderNumber: "",
    email: "",
    mobile: ""
  })
  const [current, setCurrent] = useState(0);
  const [showBulkInquiry, setShowBulkInquiry] = useState(false)
    const [products, setProducts] = useState<any[]>([]) // Initialize products state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
const router=useRouter()
const searchParams = useSearchParams()
  const [flyItem, setFlyItem] = useState<any>(null)

   const { 
  cart, 
   
  displayQuantity, 
  increaseQuantity, 
  decreaseQuantity, 
  toggleCart, 
} = useShop();

const toCartProduct = (product: any) => ({
  id: String(product.id),
  title: product.title || product.name || "",
  price: Number(product.price || 0),
  stock: typeof product.stock === "number" ? product.stock : undefined,
  images: Array.isArray(product.images)
    ? product.images.filter((img: string) => Boolean(img))
    : product.image
      ? [product.image]
      : [],
  category: product.category,
  description: product.description,
  originalPrice: product.originalPrice,
  discountType: product.discountType ?? null,
  discountValue: product.discountValue ?? 0,
  finalPrice: product.finalPrice,
  rating: product.rating ?? null,
  reviews: product.reviews ?? 0,
  tag: product.tag,
  totalSold: product.totalSold ?? 0,
})

const handleFlyToCart = (e: React.MouseEvent, img: string) => {
  const target = e.currentTarget as HTMLElement
  const startRect = target.getBoundingClientRect()

  const cartIcon = document.querySelector(".cart-icon") as HTMLElement
  if (!cartIcon) return

  const cartRect = cartIcon.getBoundingClientRect()

  const flyImg = document.createElement("img")
  flyImg.src = img
  flyImg.className = "fly-item"

  flyImg.style.left = startRect.left + "px"
  flyImg.style.top = startRect.top + "px"

  document.body.appendChild(flyImg)

  const dx = cartRect.left - startRect.left
  const dy = cartRect.top - startRect.top

  requestAnimationFrame(() => {
    flyImg.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`
    flyImg.style.opacity = "0"
  })

  setTimeout(() => {
    flyImg.remove()
  }, 600)
}
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return
    const hasSeen = window.sessionStorage.getItem(BULK_INQUIRY_SEEN_KEY) === "1"
    if (!hasSeen) {
      setShowBulkInquiry(true)
      window.sessionStorage.setItem(BULK_INQUIRY_SEEN_KEY, "1")
    }
  }, [])
  useEffect(() => {
    if (typeof window === "undefined") return

    const clearBulkInquirySessionFlag = () => {
      window.sessionStorage.removeItem(BULK_INQUIRY_SEEN_KEY)
    }

    window.addEventListener("beforeunload", clearBulkInquirySessionFlag)
    return () => {
      window.removeEventListener("beforeunload", clearBulkInquirySessionFlag)
    }
  }, [])
 useEffect(() => {
    if (searchParams.get("support") === "1") {
      setOpenChat(true)
    }
  }, [searchParams])

  const getSupportReply = (input: string) => {
    const text = input.toLowerCase()

    if (text.includes("ticket") || text.includes("issue") || text.includes("problem")) {
      return "I can raise a support ticket for you. Click the Raise Ticket button below and share issue details."
    }

    if (text.includes("book") || text.includes("repair") || text.includes("service")) {
      return "You can use Book Home Service for technician support. If you want, I can also raise a support ticket now."
    }

    if (text.includes("order") || text.includes("track") || text.includes("delivery")) {
      return "For order status, use Track Order from the top bar. If tracking is not updating, raise a support ticket here."
    }

    if (text.includes("warranty") || text.includes("guarantee")) {
      return "Please share your order number and issue details. I can create a support ticket for warranty verification."
    }

    return "Thanks. Please share more details, or use Raise Ticket so our team can follow up by email."
  }

  const sendChatMessage = () => {
    const message = chatInput.trim()
    if (!message) return

    const reply = getSupportReply(message)
    setChatMessages(prev => [
      ...prev,
      { role: "user", text: message },
      { role: "bot", text: reply }
    ])
    setChatInput("")
  }

  const raiseSupportTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim() || !ticketForm.orderNumber.trim()) {
      setChatMessages(prev => [
        ...prev,
        { role: "bot", text: "Please fill Subject, Description, and Order Number to raise your support ticket." }
      ])
      return
    }

    if (ticketForm.mobile && !/^[6-9]\d{9}$/.test(ticketForm.mobile.replace(/[\s-]/g, ""))) {
      setChatMessages(prev => [
        ...prev,
        { role: "bot", text: "Please enter a valid 10-digit mobile number." }
      ])
      return
    }

    setTicketSubmitting(true)
    try {
      const res = await fetch("/api/supportticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketForm.subject,
          description: ticketForm.description,
          orderNumber: ticketForm.orderNumber || undefined,
          email: ticketForm.email || undefined,
          phone: ticketForm.mobile || undefined,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Failed to raise support ticket")
      }

      setChatMessages(prev => [
        ...prev,
        { role: "user", text: `Ticket Request: ${ticketForm.subject}` },
        {
          role: "bot",
          text: `Your ticket has been raised successfully. Ticket Number: ${data.ticketNumber}. ${data.emailSent ? "Confirmation email sent." : "If email is configured, confirmation will be sent shortly."} ${ticketForm.mobile ? "Our team can also contact you on your mobile number." : ""}`
        }
      ])
      setTicketFormOpen(false)
      setTicketForm({ subject: "", description: "", orderNumber: "", email: "", mobile: "" })
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { role: "bot", text: err?.message || "Unable to raise ticket right now. Please try again." }
      ])
    } finally {
      setTicketSubmitting(false)
    }
  }

 useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getProducts()
        setProducts(data)
      } catch (err) {
        setError("Failed to load products")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCloseBulkInquiry = () => {
    setShowBulkInquiry(false)
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(BULK_INQUIRY_SEEN_KEY, "1")
    }
  }
  
  return (
    
    <main className="w-full min-h-screen bg-slate-50 text-slate-800 selection:bg-orange-100">
      <BulkInquiryModal isOpen={showBulkInquiry} onClose={handleCloseBulkInquiry} />
      {flyItem && (
  <img
    src={flyItem.img}
    className="fly-item rounded-lg shadow-lg"
    style={{
      top: flyItem.y,
      left: flyItem.x,
      "--dx": `${flyItem.dx}px`,
      "--dy": `${flyItem.dy}px`
    } as any}
  />
)}
      {/* 1. HERO SLIDER */}
      <section className="relative w-full h-[550px] overflow-hidden bg-black">
        {SLIDES.map((img, index) => (
          <img
            key={index}
            src={img}
            alt="Hero Slide"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === current ? "opacity-60" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-6 text-white w-full">
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tighter">
              Laptop & Computer <br /> <span className="text-orange-500">Repair Experts</span>
            </h1>
            <p className="text-xl mb-10 max-w-2xl text-gray-300 font-medium">
              Professional repair services and certified refurbished laptops at unbeatable prices.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/services" className="bg-orange-500 hover:bg-orange-600 px-10 py-4 rounded-xl font-bold shadow-xl transition-all transform hover:-translate-y-1">
                Our Services
              </Link>
              <Link href="/products" className="bg-white text-slate-900 hover:bg-gray-100 px-10 py-4 rounded-xl font-bold shadow-xl transition-all transform hover:-translate-y-1">
                Shop Refurbished
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EXPLORE CATEGORIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-12 text-slate-900 tracking-tight">
            Explore <span className="text-emerald-500 italic underline decoration-emerald-200 underline-offset-8">Refurbished</span> Tech
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
            {CATEGORIES.map((cat, index) => (
              <Link key={index} href={`/products?category=${encodeURIComponent(cat.category)}`} className="group flex flex-col items-center gap-4 transition-all hover:-translate-y-3">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-xl group-hover:border-orange-200 transition-all">
                  <img src={cat.image} alt={cat.name} className="w-3/4 h-3/4 object-contain group-hover:scale-125 transition-transform duration-500" />
                </div>
                <span className="font-bold text-slate-600 group-hover:text-orange-500 transition-colors uppercase text-xs tracking-widest">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

     

      {/* 3.5 BOOK HOME SERVICE BANNER */}
      <section className="px-6 mb-12">
        <div className="max-w-7xl mx-auto bg-linear-to-r from-purple-600 to-pink-500 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-lg">
          <div className="flex items-center gap-6 mb-6 md:mb-0 flex-1">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              <div className="bg-white p-3 rounded-full text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12a9.75 9.75 0 1 1 19.5 0 9.75 9.75 0 0 1-19.5 0Zm8.456-3.552a.75.75 0 0 0-1.212.172l-2.25 6a.75.75 0 0 0 .922.922l6-2.25a.75.75 0 0 0 .172-1.212l-3.63-3.63Z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
  <Wrench className="w-6 h-6 text-orange-500" />
  Professional Repairs at Home
</h3>
              <p className="opacity-90">Expert technicians. Zero downtime. Peace of mind.</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-lg font-semibold mb-2">Screen damage? Software issues? We fix it all!</p>
            <Link 
              href="/book-service"
              className="inline-block bg-white text-purple-600 px-8 py-3 rounded-full font-bold hover:bg-yellow-300 hover:text-purple-900 transition transform hover:scale-105"
            >
              Book Service Now
            </Link>
          </div>
        </div>
      </section>
<section className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-6">
    
    {/* --- Section Header --- */}
    <div className="flex justify-between items-end mb-12">
      <div>
        <h2 className="text-1xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
  <span className=" text-orange-600 tracking-normal mr-2">
    Trending
  </span> 
  Laptops <span className="font-light">&</span> Computers
</h2>
       
      </div>
      <Link href="/products" className="group text-orange-600 font-bold flex items-center gap-2">
        View All <span className="group-hover:translate-x-1 transition-transform">→</span>
      </Link>
    </div>

    {/* --- Loading & Error Handling --- */}
    {loading && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 h-80 rounded-xl" />
        ))}
      </div>
    )}

    {!loading && !error && (
      <>
        {products.length === 0 ? (
        <div className="max-w-6xl mx-auto px-6 py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
  
  {/* Professional Icon (Optional but recommended for balance) */}
  <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-300">
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  </div>

 
  <div className="text-center space-y-4 w-full">
    
    {/* Minimal Status Label */}
    <div className="flex items-center justify-center gap-3 mb-2">
      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
        Live Inventory Status
      </h3>
      <div className="w-1.5 h-1.5 bg-orange-500  animate-pulse"></div>
    </div>

    {/* The Main Wide Quote */}
    <p className="text-xl md:text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">
      All Certified Units <span className="text-orange-600">Currently Sold Out.</span> 
      <span className="mx-4 text-slate-200 font-light hidden md:inline">|</span>
      <span className="text-slate-400 block md:inline font-bold text-lg md:text-2xl italic capitalize tracking-normal">
        Restocking Soon
      </span>
    </p>

    {/* Horizontal Trust Divider */}
    <div className="pt-6 flex items-center justify-center gap-6 opacity-30">
      <div className="h-[1px] flex-1 max-w-[100px] bg-slate-400"></div>
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] whitespace-nowrap">
        Precision Quality Assurance In Progress
      </span>
      <div className="h-[1px] flex-1 max-w-[100px] bg-slate-400"></div>
    </div>
  </div>
</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((product: any) => (
              <div key={product.id} className="group flex flex-col">
                
                {/* --- Media Container --- */}
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 rounded-2xl shadow-sm border border-gray-100">
                  
                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    {product.discountPercent > 0 && (
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm">
                        {product.discountType === "PERCENTAGE" 
                          ? `${product.discountPercent}% OFF` 
                          : `₹${product.discountPercent} OFF`}
                      </span>
                    )}
                   
                  </div>

                  


                  {/* Image with Stock Overlay */}
<img
  src={product.images?.[0] || "/placeholder.png"}
  alt={product.title}
  onClick={() => router.push(`/products/${product.id}`)}
  className={`w-full h-full object-cover transition-transform duration-700 cursor-pointer ${
    product.stock === 0 ? "opacity-40 grayscale" : "group-hover:scale-105"
  }`}
/>

                  {/* --- Hover Slide-up Panel --- */}
                  {product.stock === 0 ? (
                    <div className="absolute inset-x-0 bottom-0 py-3 bg-slate-800/90 text-white text-center text-[10px] font-bold tracking-widest uppercase">
                      Sold Out
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/95 backdrop-blur-md border-t border-gray-100">
                      
                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity</span>
                        <div className="flex items-center gap-3">
                          <button
  onClick={(e) => {
    e.stopPropagation()
    decreaseQuantity(toCartProduct(product))
  }}
  className="text-slate-900 font-bold hover:text-orange-600"
>
  −
</button>
                          <span className="text-xs font-bold text-slate-900">{displayQuantity(String(product.id))}</span>
                          <button
  onClick={(e) => {
    e.stopPropagation()
    increaseQuantity(toCartProduct(product))
  }}
  disabled={product.stock && displayQuantity(String(product.id)) >= product.stock}
  className="text-slate-900 font-bold hover:text-orange-600 disabled:opacity-30"
>
  +
</button>
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                     <button
  onClick={(e) => {
  e.stopPropagation();
  handleFlyToCart(e, product.images?.[0] || product.image)
console.log(`%c 🛒 Button Clicked for Product: ${product.id}`, "color: #fb923c; font-weight: bold;");
  const cartProduct = toCartProduct(product)
  const productId = String(product.id)
  const existingItem = cart.find(
    (item: any) => String(item.product.id) === productId
  );

  const qty = displayQuantity(productId);

  if (existingItem) {
    if (qty === existingItem.quantity) {
      // 👉 If same quantity → REMOVE
      toggleCart(cartProduct, -999);
    } else {
      // 👉 If quantity changed → UPDATE
      toggleCart(cartProduct, qty);
    }
  } else {
    // 👉 ADD
    toggleCart(cartProduct, qty);
  }
}}
  className={`w-full py-2.5 text-[11px] font-black tracking-widest uppercase transition-colors rounded-lg cursor-pointer ${
    cart.some((item: any) => String(item.product.id) === String(product.id))
      ? "bg-black text-white   border border-red-100 hover:bg-black"
      : "bg-slate-900 text-white hover:bg-gray-600"
  }`}
>
  {cart.some((item: any) => String(item.product.id) === String(product.id)) 
    ? "Remove From Cart" 
    : "Add to Cart"}
</button>
                    </div>
                  )}
                </div>

                {/* --- Product Details --- */}
                
<div className="mt-5 space-y-1.5 px-1">
  <div className="flex justify-between items-start">
    <h3 className="text-sm font-bold text-slate-800 line-clamp-1  transition">
                    {product.title}
                  </h3>

    <div className="flex items-center gap-2">
      {/* Product Tag Badge - Logic moved here */}
      {product.tag && (() => {
        const config = TAG_CONFIG[product.tag as ProductTag] || TAG_CONFIG.DEFAULT;
        const { Icon } = config;
        return (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${config.color}`}>
            <Icon size={12} strokeWidth={3} />
            {config.label}
          </span>
        );
      })()}

      {/* Stock Badge */}
      {product.stock <= 9 && product.stock > 0 && (
        <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-full animate-pulse">
          Only {product.stock} Left
        </span>
      )}
</div>
                  </div>
                  
                 
                  
                  {/* Pricing Block - Using pricing functions for consistency with product detail page */}
                  {(() => {
                    const effectivePrice = getCatalogEffectivePrice(product)
                    const originalPrice = getCatalogOriginalEffectivePrice(product)
                    const hasDiscount = originalPrice !== null
                    const discountAmount = getCatalogDiscountAmount(product)
                    
                    return (
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-slate-900">₹{Math.round(effectivePrice).toLocaleString("en-IN")}</span>
                          {hasDiscount && <span className="text-xs line-through text-slate-400 font-medium">₹{Math.round(originalPrice ?? 0).toLocaleString("en-IN")}</span>}
                        </div>
                        {hasDiscount && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                            Save ₹{Math.round(discountAmount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>

              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
</section>
     

     <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="mb-10 text-left">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Best Deals on a <span className="text-cyan-500">Budget</span>
          </h2>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BUDGET_CATEGORIES.map((item, index) => (
            <div key={index} className="group relative bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300">
              
              {/* Outer Colored Card */}
              <div className={`${item.colorClass} rounded-2xl p-6 h-64 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300`}>
                
                {/* The "Hanging String" Visual */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8">
                   <div className="w-full h-full border-t-2 border-l-2 border-r-2 border-white/40 rounded-t-full opacity-50"></div>
                </div>

                {/* Inner Dashed Box */}
                <div className="w-full h-full border-2 border-dashed border-white/60 rounded-xl flex flex-col items-center justify-center text-center p-4">
                  <span className="text-white/80 text-[10px] font-black tracking-[0.2em] mb-1">
                    UNDER
                  </span>
                  <h3 className="text-white text-3xl font-black mb-2 tracking-tighter">
                    {item.priceTag.split(' ')[1]}
                  </h3>
                  <div className="w-full h-px bg-white/30 my-2"></div>
                  <p className="text-white text-xs font-bold tracking-widest uppercase mb-2">
                    {item.title}
                  </p>
                  <p className="text-white/80 text-[10px] leading-tight font-medium uppercase">
                    {item.description}
                  </p>
                </div>

                {/* Decorative Dots */}
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                <div className="absolute top-4 right-4 w-2 h-2 bg-white/20 rounded-full"></div>
              </div>

              {/* Action Button (+) */}
              <Link 
                href={
                  item.maxPrice === null
                    ? `/products?priceMin=${item.minPrice}`
                    : `/products?priceMin=${item.minPrice}&priceMax=${item.maxPrice}`
                }
                className={`absolute bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-all ${item.colorClass} ${item.hoverColor}`}
              >
                <span className="text-2xl font-bold">+</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  

      {/* 7. HEXATRUST */}
      <section className="py-24 bg-white text-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-20">
          <div className="w-full md:w-1/2 flex justify-center transform hover:scale-105 transition-transform duration-700">
            <img src="https://cdn.shopify.com/s/files/1/0571/1996/5366/files/HexaTrust_Image_for_Home_Page.png?v=1764135312" alt="HexaTrust" className="w-full max-w-lg drop-shadow-[0_0_50px_rgba(16,185,129,0.3)]" />
          </div>
          <div className="w-full md:w-1/2 space-y-8">
            <h2 className="text-5xl font-black leading-tight tracking-tighter">HexaTrust — <br/><span className="text-emerald-400">The Gold Standard</span></h2>
            <p className="text-slate-400 text-xl leading-relaxed font-medium">Transparency, quality, and satisfaction. HexaTrust isn't just a certification; it's our promise of excellence in IT asset management.</p>
            <Link
              href="/hexatrust"
              className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-black py-5 px-12 rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1"
            >
              Learn More About HexaTrust
            </Link>
          </div>
        </div>
      </section>

     <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* VIDEO COLUMN */}
          <div className="w-full lg:w-1/2 relative">
            {/* The "Invisible Guard" - This div sits on top to block all clicks/hovers */}
            <div className="absolute inset-0 z-20 bg-transparent cursor-default"></div>

            <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border-[12px] border-slate-50">
              <iframe 
                className="w-full h-full scale-[1.15]" 
                src="https://www.youtube.com/embed/X2HkgghG4ew?autoplay=1&mute=1&loop=1&playlist=X2HkgghG4ew&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0" 
                title="MTS Repair Process" 
                allow="autoplay"
              ></iframe>
            </div>

            {/* Float Badge */}
            <div className="absolute -bottom-6 -left-6 z-30 bg-orange-500 text-white p-5 rounded-3xl shadow-2xl rotate-3">
              <p className="text-xs font-black tracking-widest uppercase">Expert Technique</p>
              <p className="text-xl font-bold">100% Precision</p>
            </div>
          </div>

          {/* TEXT COLUMN */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8">
              Handled with <br/>
              <span className="text-orange-500 italic">Surgical Care.</span>
            </h2>

            <div className="space-y-10">
              {CARE_STEPS.map((step, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
 {/* 6. SUSTAINABILITY SLIDER */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-16 text-slate-900 tracking-tighter uppercase">Sustainability Meets <span className="text-emerald-500">Style</span></h2>
          <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] group">
            <img src="/images/slider_2-01_1_1.jpg" alt="After" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-y-0 left-0 z-10 overflow-hidden animate-reveal border-r-4 border-white">
              <img src="/images/slider_2-02_1_1.jpg" alt="Before" className="absolute inset-0 w-[100vw] max-w-none h-full object-cover" style={{ width: '1152px' }} />
            </div>
            <div className="absolute inset-y-0 z-20 animate-line flex items-center justify-center">
              <div className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center -translate-x-1/2 border-4 border-slate-50 text-slate-400 font-black">
                <span className="text-lg">⇄</span>
              </div>
            </div>
            <div className="absolute bottom-8 left-8 z-30 bg-black/60 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest">Normal Secondhand</div>
            <div className="absolute bottom-8 right-8 z-30 bg-emerald-500 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest">MTS Refurbished</div>
          </div>
        </div>
      </section>
      {/* 9. WHY US */}
      <section className="bg-slate-950 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-600 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-black mb-8 leading-none tracking-tighter">Beyond Just <span className="text-orange-500">Repairs</span></h2>
              <p className="text-slate-400 text-xl font-medium leading-relaxed">Join 50,000+ happy customers who trust MTS for factory-grade tech restoration.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 flex items-center gap-6">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="text-5xl font-black tracking-tighter">98%</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-black text-orange-500">Success Rate</div>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { title: "Expert Engineering", label: "CERTIFIED TEAM", img: "https://images.unsplash.com/photo-1597733336794-12d05021d510", icon: <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /> },
              { title: "Genuine Parts", label: "OEM QUALITY", img: "https://images.unsplash.com/photo-1518770660439-4636190af475", icon: <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-1.006 3.42 3.42 0 014.438 0c.699.516 1.547.882 2.435.882 1.9 0 3.438 1.538 3.438 3.438 0 .888-.366 1.736-.882 2.435a3.42 3.42 0 010 4.438c.516.699.882 1.547.882 2.435 0 1.9-1.538 3.438-3.438 3.438-.888 0-1.736-.366-2.435-.882a3.42 3.42 0 01-4.438 0c-.699.516-1.547-.882-2.435-.882-1.9 0-3.438-1.538-3.438-3.438 0-.888.366-1.736.882-2.435a3.42 3.42 0 010-4.438c-.516-.699-.882-1.547-.882-2.435 0-1.9 1.538-3.438 3.438-3.438.888 0 1.736.366 2.435.882z" /> },
              { title: "Rapid Logistics", label: "EXPRESS SERVICE", img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d", icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" /> }
            ].map((item, i) => (
              <div key={i} className="group relative h-[550px] rounded-[3rem] overflow-hidden border border-white/10 hover:border-orange-500 transition-all duration-700">
                <img src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover grayscale-[80%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[1.5s]" />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white mb-6 border border-white/20 group-hover:bg-orange-500 transition-all duration-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase mb-2">{item.label}</span>
                  <h3 className="text-4xl font-black mb-4 tracking-tighter">{item.title}</h3>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">Professional component-level repairs and genuine part replacement.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Common Questions</h2>
            <div className="w-20 h-1.5 bg-orange-500 mx-auto rounded-full"></div>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group bg-white border border-slate-200 rounded-3xl shadow-sm cursor-pointer transition-all hover:border-orange-200 overflow-hidden">
                <summary className="px-8 py-6 font-bold text-slate-800 flex justify-between items-center list-none group-open:bg-slate-50 transition-colors">
                  <span className="text-lg">{faq.q}</span>
                  <div className="bg-slate-900 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold transition-transform group-open:rotate-45">+</div>
                </summary>
                <div className="px-10 py-8 text-slate-500 font-medium leading-relaxed border-t border-slate-100 italic bg-white">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FLOATING ACTIONS */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-50">
        <Link 
          href="/book-service"
          title="Book Home Service"
          className="group bg-blue-500 w-16 h-16 rounded-2xl cursor-pointer shadow-2xl hover:bg-blue-600 hover:scale-110 transition-all duration-300 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-8 h-8 group-hover:rotate-12 transition-transform">
            <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-4h2v18h-2z" />
          </svg>
        </Link>
        <button onClick={() => setOpenChat(!openChat)} className="group bg-orange-500 w-16 h-16 rounded-2xl cursor-pointer shadow-2xl hover:bg-orange-600 hover:scale-110 transition-all duration-300 flex items-center justify-center">
          <Bot className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
        </button>
        <a href="https://wa.me/918743094186" target="_blank" rel="noopener noreferrer" className="group bg-emerald-500 w-16 h-16 rounded-2xl shadow-2xl hover:bg-emerald-600 hover:scale-110 transition-all duration-300 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8 group-hover:-rotate-12 transition-transform" aria-label="WhatsApp">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.198.297-.768.967-.941 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.375a9.865 9.865 0 0 1-1.51-5.26c.001-5.448 4.436-9.884 9.884-9.884 2.64.001 5.122 1.03 6.99 2.898a9.825 9.825 0 0 1 2.893 6.99c-.003 5.449-4.437 9.884-9.885 9.884" />
          </svg>
        </a>
      </div>

      {/* CHAT WINDOW */}
      {openChat && (
        <div className="fixed bottom-32 right-4 sm:right-10 w-[calc(100vw-2rem)] sm:w-96 h-[540px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-black text-sm uppercase tracking-widest">MTS Support</span>
            </div>
            <button onClick={() => setOpenChat(false)} className="hover:rotate-90 transition-transform">✕</button>
          </div>
          <div className="flex-1 p-6 text-sm text-slate-600 overflow-y-auto bg-slate-50/50">
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`p-4 rounded-2xl shadow-sm leading-relaxed font-medium ${
                    message.role === "user"
                      ? "bg-orange-500 text-white ml-6"
                      : "bg-white border border-slate-100 mr-6"
                  }`}
                >
                  {message.text}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setTicketFormOpen(prev => !prev)}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-slate-900 text-white px-3 py-2 rounded-xl hover:bg-orange-500 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                {ticketFormOpen ? "Close Ticket Form" : "Raise Support Ticket"}
              </button>

              {ticketFormOpen && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ticket subject"
                    className="w-full bg-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your issue"
                    rows={3}
                    className="w-full bg-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <input
                    type="text"
                    value={ticketForm.orderNumber}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                    placeholder="Order number (required)"
                    className="w-full bg-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="email"
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email (required if not logged in)"
                    className="w-full bg-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="tel"
                    value={ticketForm.mobile}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="Mobile number for contact"
                    className="w-full bg-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={raiseSupportTicket}
                    disabled={ticketSubmitting}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-70"
                  >
                    {ticketSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    Submit Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t bg-white flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  sendChatMessage()
                }
              }}
              placeholder="Type your inquiry..."
              className="flex-1 border-none bg-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              onClick={sendChatMessage}
              className="bg-slate-900 text-white p-3 rounded-xl hover:bg-orange-500 transition-colors"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes reveal { 0% { width: 100%; } 50% { width: 50%; } 100% { width: 100%; } }
        .animate-reveal { animation: reveal 8s ease-in-out infinite; }
        @keyframes line-move { 0% { left: 100%; } 50% { left: 50%; } 100% { left: 100%; } }
        .animate-line { animation: line-move 8s ease-in-out infinite; }
      `}</style>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent />
    </Suspense>
  )
}