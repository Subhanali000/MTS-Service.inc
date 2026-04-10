// import Razorpay from "razorpay"

// if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//   throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env.local")
// }

// export const razorpay = new Razorpay({
//   key_id:     process.env.RAZORPAY_KEY_ID!,
//   key_secret: process.env.RAZORPAY_KEY_SECRET!,
// })
// below is the tetsing code product page above is the actual code for razorpay integration
import Razorpay from "razorpay"

const isDev = process.env.NODE_ENV === "development"

let razorpay: Razorpay

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️ Using MOCK Razorpay (missing env vars)")

  // 👇 Mock implementation for local/dev builds when credentials are absent
  razorpay = {
    orders: {
      create: async (data: any) => {
        return {
          id: "order_mock_" + Date.now(),
          amount: data.amount,
          currency: data.currency || "INR",
          status: "created"
        }
      }
    }
  } as any
} else {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  })
}

export { razorpay }