import * as React from "react"
import { cn } from "@/lib/cn"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated"
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  const variants = {
    default:
      "bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300",

    glass:
      "bg-white/20 backdrop-blur-3xl border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)] transition-shadow duration-300",

    elevated:
      "bg-linear-to-r from-blue-50 to-white border border-gray-100 shadow-2xl hover:shadow-3xl rounded-3xl transition-transform duration-300 transform hover:-translate-y-1",
  }

  return (
    <div
      className={cn(
        "rounded-3xl p-6 overflow-hidden",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 mb-4",
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-2xl font-extrabold text-gray-900 tracking-tight",
        className
      )}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm text-gray-600 leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pt-3 space-y-4", className)} {...props} />
  )
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between pt-4 border-t border-gray-100",
        className
      )}
      {...props}
    />
  )
}