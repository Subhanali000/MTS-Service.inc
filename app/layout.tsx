
"use client"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useState, useRef, useEffect } from "react"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Toaster } from "react-hot-toast";
import Image from "next/image"
import PremiumSearch, { Product } from "@/components/Premiumsearch"
import BulkInquiryModal from "@/components/BulkInquiryModal"
import { ShopProvider,useShop } from "app/context/ShopContext"
import { ChevronDown, ShoppingBag, Heart, User,Ticket } from "lucide-react"
import "./globals.css"
// --- Sub-component to handle Header Logic ---
function Header({ hideLayout }: { hideLayout: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [accessoriesOpen, setAccessoriesOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [bulkInquiryOpen, setBulkInquiryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const brandsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accessoriesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
const router = useRouter();
const [cartPop, setCartPop,] = useState(false)
const [wishlistPop, setWishlistPop] = useState(false)
const [animateCart, setAnimateCart] = useState(false)
const cartRef = useRef<HTMLButtonElement | null>(null)
const { getDashboardRoute, getTicketRoute, goToCart, getOrderRoute, wishlistUpdated, cart, wishlist, cartUpdated } = useShop()
  const openBrandsMenu = () => {
    if (brandsCloseTimer.current) {
      clearTimeout(brandsCloseTimer.current)
      brandsCloseTimer.current = null
    }
    setBrandsOpen(true)
  }

  const closeBrandsMenu = () => {
    if (brandsCloseTimer.current) {
      clearTimeout(brandsCloseTimer.current)
    }

    brandsCloseTimer.current = setTimeout(() => {
      setBrandsOpen(false)
    }, 120)
  }

  const openAccessoriesMenu = () => {
    if (accessoriesCloseTimer.current) {
      clearTimeout(accessoriesCloseTimer.current)
      accessoriesCloseTimer.current = null
    }
    setAccessoriesOpen(true)
  }

  const closeAccessoriesMenu = () => {
    if (accessoriesCloseTimer.current) {
      clearTimeout(accessoriesCloseTimer.current)
    }

    accessoriesCloseTimer.current = setTimeout(() => {
      setAccessoriesOpen(false)
    }, 120)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
useEffect(() => {
  if (cartUpdated) {
    setAnimateCart(false) // reset first

    requestAnimationFrame(() => {
      setAnimateCart(true)
    })

    const t = setTimeout(() => {
      setAnimateCart(false)
    }, 400)

    return () => clearTimeout(t)
  }
}, [cartUpdated])
useEffect(() => {
  if (wishlistUpdated) {
    setWishlistPop(false)

    requestAnimationFrame(() => {
      setWishlistPop(true)
    })

    const t = setTimeout(() => {
      setWishlistPop(false)
    }, 300)

    return () => clearTimeout(t)
  }
}, [wishlistUpdated])

  useEffect(() => {
    setAccessoriesOpen(false)
    setBrandsOpen(false)
    if (accessoriesCloseTimer.current) {
      clearTimeout(accessoriesCloseTimer.current)
      accessoriesCloseTimer.current = null
    }
    if (brandsCloseTimer.current) {
      clearTimeout(brandsCloseTimer.current)
      brandsCloseTimer.current = null
    }
  }, [pathname])

const brands = [
    { name: "HP", slug: "hp" },
    { name: "Dell", slug: "dell" },
    { name: "Lenovo", slug: "lenovo" },
    { name: "ASUS", slug: "asus" },
    { name: "Acer", slug: "acer" },
  ];

const accessories = [
    { name: "Chargers", slug: "chargers" },
    { name: "Laptop Batteries", slug: "batteries" },
    { name: "Keyboards", slug: "keyboards" },
    { name: "Mouse", slug: "mouse" },
    { name: "Cooling Pads", slug: "cooling-pads" },
    { name: "Monitors", slug: "monitors" },
    { name: "Cables", slug: "cables" },
  ];
  if (hideLayout) return null

  return (
    <>
    <BulkInquiryModal isOpen={bulkInquiryOpen} onClose={() => setBulkInquiryOpen(false)} />
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      
      {/* --- TRUST TOP BAR --- */}
      <div className="bg-gray-900 text-gray-200 text-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex gap-6">
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Certified Refurbished</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2" />
                <circle cx="18.5" cy="18.5" r="2" />
              </svg>
              <span>Free Delivery</span>
            </div>
          </div>
          <div className="hidden md:flex gap-4">
            <Link href={getTicketRoute()} className="hover:text-white">Support</Link>
            <Link href="/track-order" className="hover:text-white">Track Order</Link>
          </div>
        </div>
      </div>

      {/* --- MAIN NAVIGATION BAR --- */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link href="/" className="shrink-0 flex flex-col leading-tight whitespace-nowrap">
          <span className="text-2xl font-bold text-red-600">MTS Services.Inc</span>
          <span className="text-xs text-gray-500 font-medium">Adding life to the solution</span>
        </Link>

      <nav className="hidden lg:flex items-center gap-3 text-sm font-medium text-gray-700 whitespace-nowrap shrink-0">
  
 <Link
  href="/products?category=laptops"
  className="shrink-0 hover:text-red-600"
>
  Laptops
</Link>

  <Link href="/products?category=desktops" className="shrink-0 hover:text-red-600">
    Desktops
  </Link>

  <div
      className="relative shrink-0"
      onMouseEnter={openBrandsMenu}
      onMouseLeave={closeBrandsMenu}
      onFocusCapture={openBrandsMenu}
      onBlurCapture={closeBrandsMenu}
    >
      <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors hover:bg-red-50 hover:text-red-600 focus-within:bg-red-50 focus-within:text-red-600">
        <Link
          href="/products"
          className="shrink-0"
        >
          Brands
        </Link>
        <button
          type="button"
          aria-label="Toggle brands dropdown"
          aria-expanded={brandsOpen}
          onClick={() => setBrandsOpen((prev) => !prev)}
          className="rounded-full p-1 text-gray-500 transition hover:bg-white hover:text-red-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${brandsOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {brandsOpen && (
       <div className="absolute left-0 top-full z-50 mt-3 w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
          <div className="px-3 pb-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Brands</p>
            <p className="mt-1 text-xs text-slate-500">Browse by trusted manufacturers.</p>
          </div>
          <div className="grid gap-1.5">
            {brands.map((item) => (
              <Link
                key={item.slug}
                href={`/products?brand=${item.slug}`}
                className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-red-600"
              >
                <span>{item.name}</span>
                <span className="text-slate-300 transition group-hover:text-red-500">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>


 <div
      className="relative shrink-0"
      onMouseEnter={openAccessoriesMenu}
      onMouseLeave={closeAccessoriesMenu}
      onFocusCapture={openAccessoriesMenu}
      onBlurCapture={closeAccessoriesMenu}
    >
      <div className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors hover:bg-red-50 hover:text-red-600 focus-within:bg-red-50 focus-within:text-red-600">
        <Link
          href="/products?category=accessories"
          className="shrink-0"
        >
          Accessories
        </Link>
        <button
          type="button"
          aria-label="Toggle accessories dropdown"
          aria-expanded={accessoriesOpen}
          onClick={() => setAccessoriesOpen((prev) => !prev)}
          className="rounded-full p-1 text-gray-500 transition hover:bg-white hover:text-red-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${accessoriesOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {accessoriesOpen && (
       <div className="absolute left-0 top-full z-50 mt-3 w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
          <div className="px-3 pb-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Accessories</p>
            <p className="mt-1 text-xs text-slate-500">Shop compatible add-ons and essentials.</p>
          </div>
          <div className="grid gap-1.5">
            {accessories.map((item) => (
              <Link
                key={item.slug}
                href={`/products?category=accessories&sub=${item.slug}`}
                className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-red-600"
              >
                <span>{item.name}</span>
                <span className="text-slate-300 transition group-hover:text-red-500">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>

  <button
    type="button"
    onClick={() => setBulkInquiryOpen(true)}
    className="shrink-0 hover:text-red-600"
  >
    Bulk Orders
  </button>

  <Link href="/book-service" className="shrink-0 hover:text-red-600">
    Repair Service
  </Link>

  <Link href="/track-order" className="shrink-0 hover:text-red-600">
    Track Order
  </Link>

  <Link href="/support-ticket" className="shrink-0 hover:text-red-600">
    Support
  </Link>

</nav>

<div className="hidden xl:block mr-6 2xl:mr-8">

  <div className="relative z-[70] group w-[260px] 2xl:w-[320px]">

    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>

    {/* ✨ PREMIUM SEARCH ✨ */}
              <div className="hidden sm:block">
                <PremiumSearch
                  onSearch={(q) => router.push(`/products?q=${encodeURIComponent(q)}`)}
                  onProductClick={(product: Product) => router.push(`/products/${product.id}`)}
                />
              </div>

  </div>

</div>

  <div className="ml-auto relative shrink-0 flex items-center gap-8">
  
  {/* Wishlist */}
  <button
    onClick={() => router.push('/wishlist')}
    className="relative hover:text-red-600"
  >
    <Heart className={`w-5 h-5 ${wishlistPop ? " animate-pop text-red-500 fill-red-500" : ""}`} />
    {wishlist.length > 0 && (
      <span className={`absolute -top-2 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wishlistPop ? "animate-pop" : ""}`}>
        {wishlist.length}
      </span>
    )}
  </button>

  {/* Cart */}
  <button
  ref={cartRef}
  onClick={goToCart}
  className={`group relative cursor hover:text-red-600 ${animateCart ? "animate-shake" : ""}`}
>
  <ShoppingBag className="w-5 h-5" />
  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
    {cart.length}
  </span>
</button>



          {session?.user ? (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setOpen(!open)} className="flex items-center">
                <Image
                  src={session.user.image || "/images/image.jpg"}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-gray-200 hover:border-red-400 transition"
                />
              </button>
              {open && (
  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
    {/* User Header */}
    <div className="px-4 py-2 mb-1 border-b border-gray-50">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Signed in as</p>
      <p className="text-sm font-semibold text-gray-800 truncate">
        {session.user.name || session.user.email}
      </p>
    </div>

    {/* Dashboard Link */}
    <Link
      href={getDashboardRoute()}
      onClick={() => setOpen(false)}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
      Dashboard
    </Link>

    {/* Orders Link */}
    <Link
      href={getTicketRoute()}
      onClick={() => setOpen(false)}
      className="flex items-center  gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
    >
      <Ticket className="w-4 h-4" />
      Support Tickets
    </Link>
    {/* Orders Link */}
    <Link
      href={getOrderRoute()}
      onClick={() => setOpen(false)}
      className="flex items-center  gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
    >
      <ShoppingBag className="w-4 h-4" />
      Orders
    </Link>

    <div className="my-1 border-t border-gray-50"></div>

    {/* Sign Out Button */}
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sign Out
    </button>
  </div>
)}
            </div>
          ) : (
            <Link href="/login" className="hover:text-red-600"><User className="w-5 h-5" /></Link>
          )}
        </div>
      </div>

    </header>
    </>
  )
}

// --- Main Layout ---
export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideLayout = pathname.startsWith("/dashboard")

  return (
    <html lang="en">
      <body className="bg-gray-50">
        {/* 1. SessionProvider must be the outermost so ShopProvider can use useSession() */}
        <SessionProvider> 
          {/* 2. ShopProvider can now safely call useSession() internally */}
          <ShopProvider>
            
            <Header hideLayout={hideLayout} />

            <main className={hideLayout ? "min-h-screen w-full" : "max-w-7xl mx-auto px-4 md:px-10 py-6 min-h-screen"}>
              <Toaster
                position="top-center"
                toastOptions={{ style: { zIndex: 99999 } }}
              />
              {children}
            </main>

           {!hideLayout && (
  <footer className="bg-[#0f1b2d] text-gray-300">
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">

  {/* COMPANY INFO */}
  <div className="space-y-4 md:col-span-4">
    <h3 className="text-white font-bold text-lg">MTS Services</h3>

    <p className="text-sm leading-relaxed">
      Bridging quality products and innovation through modern
      e-commerce solutions.
    </p>

   <div className="text-sm space-y-3">

  {/* India Location */}
  <a
    href="https://www.google.com/maps?q=MTS+SERVICES+A2/11,+Pankha+Rd,+Janakpuri,+New+Delhi,+110058"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-start gap-2 hover:text-orange-400 transition-colors"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#f97316" className="mt-0.5 shrink-0">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
    </svg>
    <span>MTS SERVICES A2/11, Pankha Rd, Janakpuri, New Delhi, 110058</span>
  </a>
  



  {/* Email */}
  <a
    href="mailto:info@mtsservices.com"
    className="flex items-center gap-2 hover:text-green-400 transition-colors"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#22c55e">
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
    <span>info@mtsservices.com</span>
  </a>

</div>


    <div className="pt-1">
      <p className="font-semibold mb-2">Connect With Us</p>

      <div className="flex gap-4  ">
        {/* LinkedIn */}
        <a href="#" className="hover:scale-150 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452H16.89v-5.569c0-1.329-.025-3.037-1.849-3.037-1.85 0-2.134 1.445-2.134 2.94v5.666H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.849 3.368-1.849 3.599 0 4.264 2.369 4.264 5.455v6.285zM5.337 7.433a1.988 1.988 0 1 1 0-3.977 1.988 1.988 0 0 1 0 3.977zM6.978 20.452H3.693V9h3.285v11.452z"/>
          </svg>
        </a>

        {/* Twitter */}
        <a href="#" className="hover:scale-150 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1DA1F2">
            <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04 4.28 4.28 0 0 0-7.29 3.9A12.14 12.14 0 0 1 3.15 4.7a4.28 4.28 0 0 0 1.32 5.71 4.24 4.24 0 0 1-1.94-.54v.05a4.28 4.28 0 0 0 3.43 4.2 4.3 4.3 0 0 1-1.93.07 4.29 4.29 0 0 0 4 2.98A8.6 8.6 0 0 1 2 19.54a12.13 12.13 0 0 0 6.56 1.92c7.87 0 12.18-6.52 12.18-12.18 0-.19 0-.37-.01-.56A8.7 8.7 0 0 0 22.46 6z"/>
          </svg>
        </a>

        {/* Facebook */}
        <a href="#" className="hover:scale-150 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.25.2 2.25.2v2.48h-1.27c-1.25 0-1.64.78-1.64 1.58V12h2.79l-.45 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>
          </svg>
        </a>

        {/* Instagram */}
        <a href="#" className="hover:scale-150 transition-transform">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="instaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#feda75"/>
                <stop offset="25%" stopColor="#fa7e1e"/>
                <stop offset="50%" stopColor="#d62976"/>
                <stop offset="75%" stopColor="#962fbf"/>
                <stop offset="100%" stopColor="#4f5bd5"/>
              </linearGradient>
            </defs>
            <path fill="url(#instaGradient)" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm4.25 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm4.5-8.9a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>

  {/* QUICK LINKS */}
  <div className="md:col-span-2">
    <h4 className="text-white font-semibold mb-4">Quick Links</h4>
    <ul className="space-y-2 text-sm ">
      <li className=" hover:text-white"><Link href="/">Home</Link></li>
      <li className=" hover:text-white"><Link href="/about">About Us</Link></li>
      <li className=" hover:text-white"><Link href="/products">Products</Link></li>
      <li className=" hover:text-white"><Link href="/services">Services</Link></li>
      <li className=" hover:text-white"><Link href="/contact">Contact Us</Link></li>
    </ul>
  </div>

  {/* CATEGORIES */}
  <div className="md:col-span-2">
    <h4 className="text-white font-semibold mb-4">Categories</h4>
    <ul className="space-y-2 text-sm">
      <li className="hover:text-white"><Link href="/products?category=laptops">Laptops</Link></li>
      <li className="hover:text-white"><Link href="/products?category=desktops">Desktops</Link></li>
      <li className="hover:text-white"><Link href="/products?category=accessories">Accessories</Link></li>
      <li className="hover:text-white"><Link href="/book-service">Repair Service</Link></li>
      <li className="hover:text-white"><Link href="/support-ticket">Support</Link></li>
    </ul>
  </div>

  {/* MAP */}
  <div className="md:col-span-4">
    <h4 className="text-white font-semibold mb-4">Our Location</h4>

    <div className="w-full h-56 rounded-lg overflow-hidden border border-gray-700">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.3009083857064!2d77.07193570000001!3d28.6207423!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d057d543a703d%3A0x6bf3e3f666f63029!2sMTS%20SERVICES!5e0!3m2!1sen!2sin!4v1775759061186!5m2!1sen!2sin"
        className="w-full h-full border-0"
        allowFullScreen
        loading="lazy"
      />
    </div>
  </div>



    </div>

    {/* BOTTOM COPYRIGHT BAR */}
    <div className="border-t border-gray-800 text-center py-6 text-sm text-gray-400">
      © {new Date().getFullYear()} MTS Services.Inc All rights reserved.
      <span className="mx-2">|</span>
      <Link href="/privacy-policy" className="hover:text-white">Privacy</Link>
      <span className="mx-2">|</span>
      <Link href="/terms-of-service" className="hover:text-white">Terms</Link>
      <span className="mx-2">|</span>
      <Link href="/privacy-policy#cookies" className="hover:text-white">Cookies</Link>
    </div>
  </footer>
          )}
        
      </ShopProvider>
        </SessionProvider>
      </body>
    </html>
  )
}