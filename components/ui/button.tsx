"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "glass"
  loading?: boolean
}

export function Button({
  className,
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-linear-to-r from-black to-black text-white hover:opacity-60 shadow-lg",

    outline:
      "border border-gray-300 bg-white hover:bg-gray-50 text-gray-900",

    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-900",

    glass:
      "bg-white/20 backdrop-blur-xl border border-white/30 text-white hover:bg-white/30 shadow-xl",
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M22 12a10 10 0 00-10-10"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      )}

      {children}
    </button>
  )
}