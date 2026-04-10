"use client"

import { useState , useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LEGAL_POLICIES } from "@/app/terms&condition/policies"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
export default function GoogleSignupPage() {
  const router = useRouter()
const { data: session, status } = useSession()
  // User info
    const [otpSuccessMsg, setOtpSuccessMsg] = useState(""); // string
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loadingSession, setLoadingSession] = useState(true)
 const [resendLoading, setResendLoading] = useState(false)
  // Terms & OTP states
  
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpModal, setOtpModal] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [showModal, setShowModal] = useState(false)
 const [resendTimer, setResendTimer] = useState(0)
  const [otpErrorMsg, setOtpErrorMsg] = useState("");     // string
  useEffect(() => {
  // --- Session Handling ---
  if (status !== "loading") {
    if (!session?.user?.email) {
      router.push("/login");
    } else {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setLoadingSession(false);
    }
  }

  // --- Resend Timer Handling ---
  if (resendTimer > 0) {
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }
}, [session, status, router, resendTimer]);
  // ---- OTP HANDLERS WITH DEBUG ----
  const handleSendOtp = async () => {
    console.log("[DEBUG] Sending OTP for:", { email, name, acceptedTerms })
    if (!acceptedTerms) {
      console.warn("[DEBUG] Terms not accepted")
      setShowModal(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, provider: "google" }),
      })

      console.log("[DEBUG] OTP send response status:", res.status)
      if (res.ok) {
        console.log("[DEBUG] OTP sent successfully")
        setOtpModal(true)
      } else {
        console.error("[DEBUG] Failed to send OTP")
        alert("Failed to send OTP")
      }
    } catch (err) {
      console.error("[DEBUG] Error sending OTP:", err)
    } finally {
      setLoading(false)
    }
  }

const handleVerifyOtp = async () => {
  setOtpLoading(true)
  setOtpError("")

  try {
    // 1️⃣ Verify OTP + create user in backend
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp,
        name,
        provider: "google", // Important for Google users
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setOtpError(data.message || "Invalid OTP")
      return
    }

    // 2️⃣ Redirect to dashboard — user is already created and can log in
    router.push("/dashboard/customer")

  } catch (err) {
    console.error(err)
    setOtpError("Something went wrong")
  } finally {
    setOtpLoading(false)
  }
}
 const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email,name }),
      });

      if (res.ok) {
        setOtpSuccessMsg("OTP sent successfully!"); // ✅ message string
        setResendTimer(30);

        setTimeout(() => setOtpSuccessMsg(""), 3000); // hide popup
      } else {
        setOtpErrorMsg("Error sending OTP. Please try again.");
        setTimeout(() => setOtpErrorMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setOtpErrorMsg("Error sending OTP. Please try again.");
      setTimeout(() => setOtpErrorMsg(""), 3000);
    } finally {
      setResendLoading(false);
    }
  };
  const handleContinue = () => {
  if (!acceptedTerms) {
    // First time: show modal
    setShowModal(false);
    return;
  }

  // Already accepted: send OTP
  handleSendOtp();
};


  // JSX
  return (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-linear-to-b from-gray-100 to-gray-50">
  <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center overflow-hidden relative">
    {/* Optional decorative top gradient */}
    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-linear-to-tr from-blue-400 to-purple-500 rounded-full opacity-20 blur-3xl pointer-events-none"></div>

    <h3 className="text-3xl font-extrabold text-gray-900 mb-4">
      {loadingSession ? "Loading..." : `Hello, ${name || email.split("@")[0]}`}
    </h3>

    <p className="text-gray-600 mb-6 leading-relaxed">
      Please read and accept our Terms & Conditions to continue.
    </p>

    {/* Buttons */}
    <Button
  onClick={() => setShowModal(true)}
  variant="primary"
      className="w-full cursor-pointer mb-4"
    >
      Read Terms & Conditions
    </Button>

    <Button
  onClick={() => {
    // First, mark terms as accepted
    setAcceptedTerms(true);

    // Then, continue to handle sending OTP
    handleContinue();
  }}
  variant="primary"
  loading={loading}
  className="w-full cursor-pointer"
>
  Accept & Continue
</Button>
  </div>

      {showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Dark overlay */}
    <div
      className="absolute inset-0 bg-black/50"
      onClick={() => setShowModal(false)}
    />
    {/* Modal */}
    <div className="relative bg-white w-11/12 max-w-4xl rounded-2xl shadow-lg max-h-[80vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <h3 className="font-bold text-lg">TERMS & CONDITIONS POLICIES</h3>
        <button
          onClick={() => setShowModal(false)}
          className="text-gray-500 font-bold text-xl "
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FCFCFC]">
        {Object.values(LEGAL_POLICIES).map((policy) => (
          <section key={policy.title} className="border-l-2 border-black pl-4">
            <h4 className="uppercase font-black text-xs tracking-wider text-gray-900 mb-2">
              {policy.title}
            </h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 text-sm">
              {policy.content.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      
    </div>
  </div>
)}

      {/* OTP Modal */}
{otpModal && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setOtpModal(false)}
    />

    {/* Modal Card */}
    <div className="relative bg-white rounded-3xl shadow-2xl w-11/12 max-w-md p-8 flex flex-col items-center text-center overflow-hidden">
      
      {/* Decorative gradient circle */}
      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-full bg-linear-to-tr from-blue-400 to-purple-500 opacity-20 blur-3xl pointer-events-none"></div>

      <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Verify OTP</h3>
     <p className="text-gray-600 mb-6">
  Hi <strong>{name || email.split("@")[0]}</strong>, please enter the 6-digit code we just sent to <strong>{email}</strong> to continue.
</p>

      <input
        type="text"
        value={otp}
        maxLength={6}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
        className="w-full p-3 mb-4 border border-gray-300 rounded-xl text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {otpError && (
        <p className="text-red-500 text-sm mb-2">{otpError}</p>
      )}

      <Button
        onClick={handleVerifyOtp}
        disabled={otp.length < 6 || otpLoading}
        variant="primary"
        className="w-full cursor-pointer bg-black mb-3"
      >
        {otpLoading ? "Verifying..." : "Verify OTP"}
      </Button>

      <button
        type="button"
        disabled={resendTimer > 0 || resendLoading}
        onClick={handleResendOtp}
        className="w-full flex flex-col items-center disabled:opacity-50"
      >
        <span className="text-gray-700 font-medium text-sm mb-1">
          Didn't get code?
        </span>
        <span
          className={`text-xs font-bold tracking-widest uppercase ${
            resendTimer > 0
              ? "text-gray-400"
              : "text-blue-600 hover:text-blue-800"
          }`}
        >
          {resendTimer > 0
            ? `Resend code in ${resendTimer}s`
            : resendLoading
            ? "Sending..."
            : "Resend code"}
        </span>
      </button>

      {/* OTP Popups */}
      <AnimatePresence>
        {/* Success popup */}
        {otpSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg z-50"
          >
            {otpSuccessMsg}
          </motion.div>
        )}

        {/* Error popup */}
        {otpErrorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-50"
          >
            {otpErrorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
)}
            
            
            
            
        
    </div>
  )
}