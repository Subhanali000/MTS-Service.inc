import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-10">
        <h1 className="text-3xl font-bold text-gray-800">
          Admin Dashboard
        </h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Products */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Products</h2>
          <Link
            href="/dashboard/admin/products"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Manage Products
          </Link>
        </div>

        {/* Orders */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Orders</h2>
          <Link
            href="/dashboard/admin/orders"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            View Orders
          </Link>
        </div>

        {/* Users */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-3">Users</h2>
          <Link
            href="/dashboard/admin/users"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Manage Users
          </Link>
        </div>

      </div>
    </div>
  )
}
