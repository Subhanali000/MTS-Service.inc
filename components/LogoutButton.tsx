"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="
        bg-red-600 text-white
        px-4 py-2 rounded-lg
        font-medium
        hover:bg-red-700
        transition-colors
        shadow-sm
      "
    >
      Logout
    </button>
  )
}
