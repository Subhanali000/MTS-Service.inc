// app/dashboard/customer/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Ensure this path is correct
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"; // Your Prisma singleton
import LogoutButton from "@/components/LogoutButton";

type CustomerOrder = {
  id: string;
  totalAmount: number;
  status: string;
};

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions);

  // 1. Session & Role Check
  if (!session || session.user.role !== "CUSTOMER") {
    redirect("/login");
  }

  // 2. Fetch User Data from PostgreSQL
  // Using findUnique because 'id' is indexed
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  // 3. Fetch Orders from PostgreSQL
  // Using findMany to get all orders for this user
  const orders = (await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' } // Optional: Show newest first
  })) as CustomerOrder[];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Customer Dashboard
          </h1>
          <LogoutButton />
        </div>

        {/* Personal Details */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
          <div className="space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Name:</span> {user?.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Orders</h2>

          {orders.length === 0 ? (
            <p className="text-gray-500">No orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((o: CustomerOrder) => (
  <li key={o.id} className="border rounded-lg p-4 hover:shadow transition">
    <p className="text-sm text-gray-500">
      Order ID: {o.id}
    </p>
    <p className="font-medium">
      {/* ❌ Change o.total to o.totalAmount */}
      Total: <span className="text-green-600">${o.totalAmount}</span>
    </p>
    <p className={`inline-block mt-1 px-3 py-1 text-sm rounded-full ${
      o.status === "DELIVERED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
    }`}>
      {o.status}
    </p>
  </li>
))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}