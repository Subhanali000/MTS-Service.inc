"use client"

import { useState } from "react"
import { useShop } from "app/context/ShopContext";
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
const { login, googleLogin, loading, googleLoading, error } = useShop()
  const router = useRouter()
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  await login(email, password)
}
 
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#060608] overflow-hidden px-4">
      <div className="absolute inset-0 bg-linear-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] z-0" />
      
      <div className="absolute inset-0 z-0 opacity-[0.04]" 
        style={{ backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
      />

      <div className="relative z-10 flex w-full max-w-5xl h-auto lg:h-155 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        
        {/* LEFT SIDE: PRODUCT SHOWCASE */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-br from-blue-900/30 to-black/20 p-12 flex-col justify-between overflow-hidden">
          <div className="z-20">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Certified Laptops & Desktop
              </span>
            </div>
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Premium Hardware.<br /> 
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">
                Eco-Friendly Choice.
              </span>
            </h2>
            <p className="text-slate-400 mt-2 max-w-xs text-sm leading-relaxed">
              MTS Services.Inc provides rigorously tested hardware with full warranty support.
            </p>
          </div>

          <img 
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1926&auto=format&fit=crop" 
            alt="Refurbished Hardware" 
            className="absolute bottom-[-5%] right-[-10%] w-[115%] opacity-70 mix-blend-lighten pointer-events-none transition-transform duration-700 hover:scale-105"
          />
          
          <div className="z-20 text-xs text-slate-500 font-medium">
            Join 10,000+ happy customers using MTS Services
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="w-full lg:w-1/2 p-8 lg:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:opacity-80 transition-opacity">
              MTS <span className="text-blue-500">SERVICES.Inc</span>
            </Link>
            <h1 className="text-xl font-bold text-white mt-8 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-sm mt-1">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* GOOGLE BUTTON: Uses googleLoading */}
          <button 
            onClick={googleLogin}
            disabled={googleLoading || loading} 
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-white/10 transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C34 32.9 29.5 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
                <path fill="#4CAF50" d="M24 44c5.4 0 10.4-2.1 14.1-5.6l-6.5-5.3C29.6 34.9 27 36 24 36c-5.5 0-10.1-3.7-11.7-8.7l-6.6 5.1C9.1 39.5 16 44 24 44z" />
                <path fill="#4285F4" d="M43.6 20H24v8h11.3c-1.1 3.1-3.4 5.6-6.5 7.1l6.5 5.3C39.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-4z" />
              </svg>
            )}
            <span>{googleLoading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#12192b] px-3 text-slate-500">Or email login</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all" 
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all" 
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <Link href="/forgot-password"  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>
            
            {/* SIGN IN BUTTON: Uses original loading state */}
            <button 
              type="submit" 
              disabled={loading || googleLoading}
              className="w-full cursor-pointer bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account? <Link href="/signup" className="text-white font-semibold hover:text-blue-400 transition-colors">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}