"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"

export default function SettingsPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  const handleSave = () => {
    alert("Profile updated (demo)")
    // later we connect this to database
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">

      <h2 className="text-2xl font-bold mb-6">
        Profile Settings
      </h2>

      {/* Profile Header */}
      <div className="flex items-center gap-6 mb-8">

        <img
          src={user?.image || "/images/image.jpg"}
          alt="profile"
          className="w-24 h-24 rounded-full object-cover border"
        />

        <div>
          <h3 className="text-xl font-semibold">
            {user?.name}
          </h3>
          <p className="text-gray-500">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">

        <div>
          <label className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border rounded-lg px-4 py-2 bg-gray-100"
          />
        </div>

        <button
          onClick={handleSave}
          className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
