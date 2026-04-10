export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 text-center max-w-md w-full">

        {/* ✅ Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* ✅ Title */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Payment Successful
        </h1>

        {/* ✅ Subtitle */}
        <p className="text-gray-500 mb-6 text-sm">
          Your order has been placed successfully.  
          You can track it from your orders section.
        </p>

        {/* ✅ Button */}
        <a
          href="/orders"
          className="inline-block w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition"
        >
          View Orders
        </a>
      </div>
    </div>
  );
}