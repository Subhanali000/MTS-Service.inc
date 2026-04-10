"use client"

import { ReactNode, useEffect, useState,useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState(false)

  const user = session?.user
const menuRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpenMenu(false)
    }
  }

  document.addEventListener("mousedown", handleClickOutside)
  return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])
  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
  }, [session, status, router])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

      {/* ================= HEADER ================= */}
      <header className="bg-orange-400 shadow px-6 py-3 flex justify-between items-center shrink-0 z-20">
       
        <div className="flex items-center gap-3">
          <img 
            src="/next.svg" 
            alt="MTS Logo" 
            className="h-8 w-auto object-contain" 
          />
          <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
        </div>

        <div className="relative cursor-pointer">
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="flex items-center gap-3 hover:bg-orange-500/20 p-2 rounded-lg transition"
          >
            <Image
  src={user?.avatar || user?.image || "/images/image.jpg"}
  alt="profile"
  width={40}
  height={40}
  className="rounded-full object-cover border-2 border-white"
/>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-gray-700">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {openMenu && (
            <div  ref={menuRef} className="absolute cursor-pointer right-0 mt-2 w-44 bg-white border rounded shadow-xl z-50">
              <button onClick={() => { setOpenMenu(false); router.push("/dashboard/profile") }} className="w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer">Profile</button>
              <button onClick={() => { setOpenMenu(false); router.push("/dashboard/settings") }} className="w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer">Settings</button>
              <hr />
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100 cursor-pointer">Logout</button>
            </div>
          )}
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="flex flex-1 overflow-hidden">

        {/* ================= SIDEBAR ================= */}
        {/* Added flex flex-col to allow the footer to stay at bottom */}
        <aside className="w-64 min-w-64 bg-black text-white flex flex-col justify-between shrink-0">
          
          {/* Top: Navigation Links */}
          <div className="p-6 space-y-6">
            
            <h2 className="text-xl font-bold border-b border-gray-800 pb-2">
  {user?.role === "ADMIN"
    ? `Admin Panel (${user?.name})`
    : `Hello, ${user?.name || "User"}`}
</h2>

            <nav className="space-y-4">
              <button
                onClick={() => router.push(user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/customer")}
                className="block w-full text-left hover:text-orange-400 transition-colors font-medium"
              >
                Dashboard Home
              </button>
              <button
                onClick={() => router.push("/")}
                className="block w-full text-left hover:text-orange-400 transition-colors font-medium"
              >
                Go to Shopping
              </button>

              {user?.role === "ADMIN" ? (
                <button
                  onClick={() => router.push("/dashboard/admin/users")}
                  className="block w-full text-left hover:text-orange-400 transition-colors font-medium"
                >
                  Manage Users
                </button>
              ) : (
                <button
                  onClick={() => router.push("/dashboard/customer/orders")}
                  className="block w-full text-left hover:text-orange-400 transition-colors font-medium"
                >
                  My Orders
                </button>
              )}
            </nav>
          </div>

          {/* Bottom: Sidebar Footer */}
          <footer className="p-6 border-t border-gray-800 text-[11px] text-gray-500 text-center">
            © {new Date().getFullYear()} MTS Service.Inc
          </footer>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          {children}
        </main>

      </div>
    </div>
  )
}