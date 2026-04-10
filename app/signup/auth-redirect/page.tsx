"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    // 🔐 Not logged in → go login
    if (status === "unauthenticated") {
      router.replace("/login")
      return
    }

    // ✅ Logged in
    if (status === "authenticated") {
      if ((session?.user as { isNew?: boolean } | undefined)?.isNew) {
        router.replace("/signup/google-signup") // new user flow
      } else {
        router.replace("/dashboard/customer") // existing user → dashboard
      }
    }
  }, [status, session, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading.....</p>
    </div>
  )
}