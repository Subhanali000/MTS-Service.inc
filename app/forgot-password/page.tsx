"use client"

import { useState } from "react"
 import { DotLottieReact } from '@lottiefiles/dotlottie-react';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      setMessage("If an account with that email exists, a reset link has been sent.")
      setEmail("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  
    
   return (
  <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">

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
  <div className="hover:scale-105 duration-300 ease-in-out  relative w-full max-w-md border-t-2 border-r-2 border-l-2 border-b-2  shadow-2xl bg-linear-to-br from-blue-400/40 via-indigo-400/40 to-purple-500/20 rounded-2xl p-8 backdrop-blur-xl">

      <h1 className="text-2xl font-semibold text-center mb-6">
        Forgot Password
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer bg-black text-white py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && (
        <p className="text-green-600 text-sm mt-4 text-center">
          {message}
        </p>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-4 text-center">
          {error}
        </p>
      )}

    </div>
  </div>
)}
