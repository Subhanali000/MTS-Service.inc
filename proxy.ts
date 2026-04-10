// proxy.ts

import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = req.nextUrl

  // 🚫 If not logged in → block dashboard routes
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 🔒 Admin route protection
  if (pathname.startsWith("/dashboard/admin")) {
    if (token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/customer", req.url))
    }
  }

  // ✅ Allow everything else
  return NextResponse.next()
}

// ✅ Apply to all dashboard routes
export const config = {
  matcher: ["/dashboard/:path*"],
}