"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
 import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Loader from "@/components/Loader"
export default function ResetPasswordPage() {
  const { token } = useParams()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [checkingToken, setCheckingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenDebug, setTokenDebug] = useState<any>(null) // 👈 store backend response

  const isValid =
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword

  // ✅ Validate token when page loads
useEffect(() => {
  const validateToken = async () => {
    try {
      console.log("[DEBUG] Sending token to backend for validation:", token);

      const res = await fetch(`/api/auth/reset-password/${token}`);
      const data = await res.json(); // safe now, always JSON
      console.log("[DEBUG] Backend response:", data);

      setTokenValid(data.valid);
    } catch (err: any) {
      console.log("[DEBUG] Token validation error:", err);
      setTokenValid(false);
    } finally {
      setCheckingToken(false);
    }
  };

  if (token) validateToken();
}, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")
    setMessage("")

    if (password.length < 8) {
      return setError("Password must be at least 8 characters")
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match")
    }

    try {
      setLoading(true)

      console.log("[DEBUG] Sending password reset request to backend")

      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()
      console.log("[DEBUG] Backend response:", data)

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      setMessage("Password reset successful! Redirecting to login...")

      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Loading screen while checking token
if (checkingToken) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader />
    </div>
  )
}


  // ❌ If token invalid or expired
  if (!tokenValid) {
    return (
       <div className="relative min-h-screen flex items-center justify-center px-4">

    {/* Background Image */}
   <DotLottieReact
      src="https://lottie.host/af812781-d7d8-4fcf-b3b6-3a18af02d85b/XG0hCRoNHq.lottie"
      loop
      autoplay
      className="absolute inset-0 bg-cover bg-center"
    />

    {/* Dark Overlay */}
    <div className="absolute inset-0 " />

    {/* Card */}
    <div className="relative w-full max-w-md bg-linear-to-br from-blue-400/40 via-indigo-400/40 to-purple-500/20 hover:scale-105 duration-300 ease-in-out border-t-2 border-r-2 border-l-2 border-b-2 backdrop-blur-md shadow-2xl rounded-2xl p-8">
        
          <h2 className="text-xl font-semibold mb-4 text-red-600">
            Link Expired
          </h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => router.push("/forgot-password")}
            className=" cursor-pointer bg-black text-white px-6 py-2 rounded-lg hover:opacity-90"
          >
            Request New Link
          </button>
        </div>
      </div>
    )
  }
  
  return (
   <div className="relative min-h-screen flex items-center justify-center px-4">
       {/* Background Image */}
    <DotLottieReact
      src="https://lottie.host/af812781-d7d8-4fcf-b3b6-3a18af02d85b/XG0hCRoNHq.lottie"
      loop
      autoplay
      className="absolute inset-0 bg-cover bg-center"
    />
       <div className="absolute inset-0" />

        
         <div className="relative bg-linear-to-br from-blue-400/40 via-indigo-400/40 to-purple-500/20 hover:scale-105 duration-300 ease-in-out border-t-2 border-r-2 border-l-2 border-b-2 backdrop-blur-md z-10 w-full max-w-md bg-white shadow-lg rounded-xl p-8">
    <h1 className="text-2xl font-semibold text-center mb-6">
      Reset Password
    </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

  {/* New Password */}
  <div className="relative">
    <label className="block text-sm font-medium mb-1">
      New Password
    </label>

    <input
      type={showPassword ? "text" : "password"}
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black"
      placeholder="Enter new password"
    />

    {/* Eye Icon */}
   <button
  type="button"
  onClick={() => setShowPassword(prev => !prev)}
  className="absolute right-3 top-9 text-gray-500"
>
  {showPassword ? (
   
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0112 19C7 19 2.73 15.11 1 12c.73-1.29 1.71-2.43 2.87-3.36M9.9 4.24A10.94 10.94 0 0112 5c5 0 9.27 3.89 11 7a10.96 10.96 0 01-4.06 4.24M1 1l22 22" />
    </svg>
  )}
</button>


  </div>

  {/* Confirm Password */}
  <div className="relative">
    <label className="block text-sm font-medium mb-1">
      Confirm Password
    </label>

    <input
      type={showConfirmPassword ? "text" : "password"}
      required
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black"
      placeholder="Confirm new password"
    />

    {/* Eye Icon */}
    <button
  type="button"
  onClick={() => setShowConfirmPassword(prev => !prev)}
  className="absolute right-3 top-9 text-gray-500"
>
  {showConfirmPassword ? (
    
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
   
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0112 19C7 19 2.73 15.11 1 12c.73-1.29 1.71-2.43 2.87-3.36M9.9 4.24A10.94 10.94 0 0112 5c5 0 9.27 3.89 11 7a10.96 10.96 0 01-4.06 4.24M1 1l22 22" />
    </svg>
  )}
</button>

  </div>

  {/* Validation Message */}
  {password && password.length < 8 && (
    <p className="text-red-500 text-sm">
      Password must be at least 8 characters.
    </p>
  )}

  {confirmPassword && password !== confirmPassword && (
    <p className="text-red-500 text-sm">
      Passwords do not match.
    </p>
  )}

  {/* Submit Button */}
  <button
  type="submit"
  disabled={!isValid || loading}
  className="w-full cursor-pointer bg-black text-white py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? "Resetting..." : "Reset Password"}
</button>

</form>


       

        

      </div>
      <AnimatePresence>
  {/* Success popup */}
  {message && (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-1000"
    >
      {message}
    </motion.div>
  )}

  {/* Error popup */}
  {error && (
    <motion.div
      key="error"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-1000"
    >
      {error}
    </motion.div>
  )}
</AnimatePresence>

    </div>
  )
}
