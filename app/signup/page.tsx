  "use client"

  import { useState, useEffect } from "react"
  import { motion, AnimatePresence } from "framer-motion"
  import Link from "next/link"
  import { signIn, getSession } from "next-auth/react"
  import { useRouter } from "next/navigation"
  import { Card, CardContent } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { DotLottieReact } from '@lottiefiles/dotlottie-react';
  import { LEGAL_POLICIES } from "@/app/terms&condition/policies";
import { useSearchParams } from "next/navigation"
  // Luxury Label Component
  const Label = ({ children }: { children: string }) => (
    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-black mb-1 block ml-1">
      {children}
    </label>
  )

  // Reusable Input Component for consistency
  const StyledInput = ({ icon: Icon, ...props }: any) => (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon />
      </div>
      <input
        {...props}
        className={`w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-600 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-blue-400 transition-all text-sm placeholder:text-gray-300 ${props.className}`}
      />
    </div>
  )
  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.5 4.5m15 15l-5.38-5.38m1.34-3.136C19.662 10.138 21 12 21 12c-1.274 4.057-5.064 7-9.542 7-1.127 0-2.193-.186-3.178-.529M21 21L3 3" />
    </svg>
  )
  const MailIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  const LockIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" /></svg>
  const UserIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>
  const PhoneIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2h-1C8.82 21 3 15.18 3 8V5z" /></svg>

  export default function CosmeticsSignupPage() {
    const router = useRouter()
    const [step, setStep] = useState<"signup" | "otp" | "verify">("signup")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [otp, setOtp] = useState("")
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // For success popup message
  const [otpSuccessMsg, setOtpSuccessMsg] = useState(""); // string
  const [otpErrorMsg, setOtpErrorMsg] = useState("");     // string
const [googleLoading, setGoogleLoading] = useState(false)
    const [emailError, setEmailError] = useState("")
    const [phone, setPhone] = useState("")
    
    const [resendTimer, setResendTimer] = useState(0)
    const [otpLoading, setOtpLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    // Logic remains identical to your provided code
    const strength = (password: string) => {
      let score = 0
      if (password.length > 7) score++
      if (/[A-Z]/.test(password)) score++
      if (/[0-9]/.test(password)) score++
      return score
    }

    useEffect(() => {
      if (resendTimer <= 0) return
      const interval = setInterval(() => setResendTimer((p) => p - 1), 1000)
      return () => clearInterval(interval)
    }, [resendTimer])

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!acceptedTerms) {
    setEmailError("You must accept the terms and conditions to proceed.");
    return;
  }

  // Clear previous errors
  setEmailError("");
  setPasswordError("");
  // Password validation
  if (password.length < 8) {
    setPasswordError("Password must be at least 8 characters");
    return;
  }

  if (password !== confirmPassword) {
    setPasswordError("Passwords do not match");
    return;
  }

  // ===============================
  // 1️⃣ Check if email already exists
  // ===============================
  try {
    const resCheck = await fetch("/api/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const dataCheck = await resCheck.json();

    if (!resCheck.ok) {
      setEmailError("Error checking email");
      return;
    }

    if (dataCheck.registered) {
      setEmailError("Email is already registered");
      return;
    }

  } catch (err) {
    console.error(err);
    setEmailError("Error checking email");
    return;
  }

  // ===============================
  // 2️⃣ Send OTP if email is available
  // ===============================
  setLoading(true);

  try {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        acceptedTerms: true
      }),
    });

    if (res.ok) {
      setStep("otp");
    } else {
      setEmailError("Error sending OTP");
    }

  } catch (err) {
    console.error(err);
    setEmailError("Error sending OTP");
  } finally {
    setLoading(false);
  }
};



    

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);

    try {
      console.group("OTP Verification & Registration Debug");

      const requestBody = { email, otp, name, password,acceptedTerms: true  };
      console.log("%cFrontend sending request:", "color: blue; font-weight: bold", requestBody);
console.log(
        "%cLegal Compliance Check:", 
        "color: #8B5CF6; font-weight: bold; font-size: 12px;", 
        { accepted: requestBody.acceptedTerms, timestamp: new Date().toISOString() }
      );
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("%cBackend response status:", "color: purple; font-weight: bold", res.status);

      const data = await res.json();
      console.log("%cBackend response body:", "color: green; font-weight: bold", data);

      if (res.ok && data.success) {
        // ✅ OTP verified & account created
        setOtpSuccessMsg(data.message || "Account created successfully!");
        setTimeout(() => setOtpSuccessMsg(""), 3000);
  router.push("/dashboard/customer")
        setTimeout(() => {
      
    }, 3000);
  // redirect to dashboard
      } else {
        const reason = data.message || "OTP verification failed.";
        setOtpErrorMsg(reason);
        setTimeout(() => setOtpErrorMsg(""), 3000);
        console.warn("OTP / Registration failed:", reason);
      }

      console.groupEnd();
    } catch (err: any) {
      console.error("Error verifying OTP / creating account:", err);
      setOtpErrorMsg("Server error. Please try again later.");
      setTimeout(() => setOtpErrorMsg(""), 3000);
    } finally {
      setOtpLoading(false);
    }
  };

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
const handleGoogleSignup = async () => {
  try {
    setGoogleLoading(true);

    // Sign in with Google, letting next-auth handle redirect automatically
   await signIn("google", {
  callbackUrl: "/signup/auth-redirect",
})

    // No need to getSession() or push manually
  } catch (error) {
    console.error("Google signup error:", error);
  } finally {
    setGoogleLoading(false);
  }
};
const getStrengthColor =(level: number, strength: number)=>{
  if(strength<=1) return "bg-red-400";
  if(strength===2) return "bg-yellow-400";
  if(strength>=3) return "bg-green-500";
  return"bg-gray-200"
  
}
const isIndianPhoneNumber = (num: string) => {
  // Remove any non-digit characters
  const digits = num.replace(/\D/g, "");
  // Regex for Indian mobile numbers: starts with 6-9 and has 10 digits
  const regex = /^[6-9]\d{9}$/;
  return regex.test(digits);
};


    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">

  {/* 🔥 Lottie Background (Deepest Layer) */}
 <div className="absolute inset-0 -z-30">
  <DotLottieReact
      src="https://lottie.host/44e7e62e-f89d-431a-944b-6cec312d198d/mJxEsj6p9x.lottie"
      loop
      autoplay
    
    className="w-full h-full object-cover scale-110"
  />
</div>

{/* Luxury Overlay */}
<div className="absolute inset-0 -z-20" />

  {/* Animated Blobs */}
  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] animate-pulse -z-10" />
  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[120px] animate-pulse -z-10" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-120"
        >
         <Card
  className="
    bg-white/80
    backdrop-blur-xl
    border border-white/40
    shadow-[70px_10px_20px_rgba(0,0,0,0.12),70px_20px_40px_rgba(0,0,0,0.08),70px_40px_80px_rgba(0,0,0,0.06)]
    rounded-[30px]
    overflow-hidden
  "
>
            <CardContent className="p-10">
              
              <AnimatePresence mode="wait">
                {step === "signup" && (
                  <motion.form 
                    key="signup"
                    exit={{ x: -20, opacity: 0 }}
                    onSubmit={handleSignup}
                    className="space-y-5"
                  >
                  <div className="flex flex-col items-start space-y-2 mb-8">

    <h2 className="text-3xl font-black tracking-tight text-gray-900">
      Signup Here
    </h2>

    <div className="flex items-baseline gap-2">
      <span className="text-lg text-gray-700">Welcome to</span>
      <Link href="/"className="text-lg font-semibold text-pink-600">
        MTS Services.inc
      </Link>
    </div>

    <p className="text-gray-400 text-sm">
      Experience the future of beauty.
    </p>

  </div>
{/* Google button */}
      <button
  onClick={handleGoogleSignup}

  disabled={googleLoading}
  className="w-full  cursor-pointer flex items-center justify-center gap-3 bg-gray-50 border border-gray-200 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition mb-6"
>
  

        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C34 32.9 29.5 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.1 29.2 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
          <path fill="#4CAF50" d="M24 44c5.4 0 10.4-2.1 14.1-5.6l-6.5-5.3C29.6 34.9 27 36 24 36c-5.5 0-10.1-3.7-11.7-8.7l-6.6 5.1C9.1 39.5 16 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-1.1 3.1-3.4 5.6-6.5 7.1l6.5 5.3C39.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>

        {googleLoading ? "Signing in..." : "Continue with Google"}
      </button>

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-gray-400">
            or continue with email
          </span>
        </div>
      </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Full Name</Label>
                          <StyledInput icon={UserIcon} placeholder="e.g. Jane Doe" value={name} onChange={(e:any) => setName(e.target.value)} required />
                        </div>
                      <div>
    <Label>Email Address</Label>
    <StyledInput
      icon={MailIcon}
      type="email"
      placeholder="jane@example.com"
      value={email}
      onChange={(e:any) => setEmail(e.target.value)}
      required
    />
    {emailError && (
      <p className="text-red-500 text-xs mt-1">{emailError}</p>
    )}
  </div>

                        <div>
  <Label>Phone Number</Label>
  <StyledInput
    icon={PhoneIcon}
    type="tel"
    maxLength={10}
    placeholder="000 000 0000"
    value={phone}
    onChange={(e: any) => setPhone(e.target.value.replace(/\D/g, ""))}
    required
  />
  {!isIndianPhoneNumber(phone) && phone.length > 0 && (
    <p className="text-red-500 text-sm mt-1">Please enter a valid Indian phone number</p>
  )}
</div>
                      </div>

                      
  <div className="grid grid-cols-2 gap-4">
    {/* Password Field */}
    <div className="relative">
      <Label>Password</Label>
      <div className="relative group">
        <StyledInput 
          icon={LockIcon} 
          type={showPassword ? "text" : "password"} 
          placeholder="••••••••" 
          value={password} 
          onChange={(e: any) => setPassword(e.target.value)} 
          required 
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors focus:outline-none"
        >
          {showPassword ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>

      {/* Password length feedback */}
      {password && password.length < 8 && (
        <p className="mt-1 text-sm text-red-500">
          Password must be at least 8 characters
        </p>
      )}
    </div>

    {/* Confirm Password Field */}
    <div className="relative">
      <Label>Confirm</Label>
      <div className="relative group">
        <StyledInput 
          icon={LockIcon} 
          type={showConfirmPassword ? "text" : "password"} 
          placeholder="••••••••" 
          value={confirmPassword} 
          onChange={(e: any) => setConfirmPassword(e.target.value)} 
          required 
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors focus:outline-none"
        >
          {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>

      {/* Confirm password feedback */}
      {confirmPassword && (
        <p className={`mt-1 text-sm ${password === confirmPassword ? "text-green-500" : "text-red-500"}`}>
          {password === confirmPassword ? "" : "Passwords do not match"}
        </p>
      )}
    </div>
  </div>


                      {/* Password Strength Indicator */}
                      <div className="flex gap-1.5 px-1 pt-1">
  {[0, 1, 2, 3].map((i) => (
    <div
      key={i}
      className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
        i < strength(password) ? getStrengthColor(i, strength(password)) : "bg-gray-200"
      }`}
    />
  ))}
</div>
                    </div>
  <div className="flex items-start space-x-3 py-2 group cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
    <div className="relative flex items-center">
      <input
        type="checkbox"
        checked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-gray-300 transition-all checked:border-black checked:bg-black focus:outline-none"
      />
      <svg
        className="absolute left-1 h-3 w-3 pointer-events-none hidden peer-checked:block text-white"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    
    <label className="text-xs leading-tight text-gray-500 select-none">
      By creating an account, I agree to the 
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // Prevents checking the box when clicking the link
          setShowModal(true);
        }}
        className="text-black font-bold hover:underline ml-1"
      >
        Terms of Service & Privacy Policy
      </button>
    </label>
  </div>

 
                    {passwordError && <p className="text-[11px] text-red-500 text-center font-semibold">{passwordError}</p>}

                    <div className="pt-4 space-y-4">
                    <Button
    type="submit"
    disabled={
      loading || // existing loading state
      password.length < 8 || // password too short
      confirmPassword !== password  ||!acceptedTerms || loading ||!isIndianPhoneNumber(phone)// mismatch
    }
    className={`w-full h-14 ${
      password.length >= 8 && confirmPassword === password 
        ? "bg-linear-to-r from-black to-black hover:shadow-xl"
        : "bg-gray-400 cursor-not-allowed"
    } text-white rounded-2xl cursor-pointer text-sm font-bold tracking-widest transition-all active:scale-[0.98]`}
  >
    {loading ? "PROCESSING..." : "CREATE ACCOUNT"}
  </Button>

                      
                      <div className="text-center">
                        <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors tracking-tighter uppercase">
                          Already have an account? <span className="text-gray-900 underline hover:text-purple-700 underline-offset-4">Sign In</span>
                        </Link>
                      </div>
                    </div>
                  </motion.form>
                )}


                {step === "otp" && (
                <motion.form 
                    key="otp"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    onSubmit={handleOtp}
                    className="space-y-8 py-4"
                  >
                    {/* Back Link at top-left */}
      <div className="absolute top-0 left-0 mt-2 ml-2">
    <button
      type="button"
      onClick={() => setStep("signup")} // go back to signup step
      className="text-xs font-bold cursor-pointer text-gray-500 hover:text-gray-700 underline tracking-widest"
    >
      ← Back
    </button>
  </div>
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <MailIcon />
                      </div>
                      <h2 className="text-2xl font-black">Check your mail</h2>
                     <p className="text-gray-600 mb-6">
  Hi <strong>{name || email.split("@")[0]}</strong>, please enter the 6-digit code we just sent to <strong>{email}</strong> to continue.
</p>

                    </div>

                    <input
                      type="text"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-center text-4xl font-light tracking-[0.5em] outline-none focus:border-purple-500 transition-colors"
                    />

                    <div className="space-y-4">
                      <Button 
    type="submit" 
    disabled={otpLoading || otp.length < 6}
                        className="w-full h-14 bg-linear-to-r from-black to-black text-white rounded-2xl font-bold tracking-widest"
  >
    {otpLoading ? "VERIFYING..." : "CONFIRM CODE"}
  </Button>

  <button
    type="button"
    disabled={resendTimer > 0 || resendLoading}
    onClick={handleResendOtp}
    className="w-full flex flex-col items-center cursor-pointer disabled:opacity-50"
  >
    <span className="text-black font-medium text-sm mb-1">
      Didn't get code?
    </span>
    <span
      className={`text-xs font-bold tracking-widest uppercase ${
        resendTimer > 0 ? "text-gray-400" : "text-purple-600 hover:text-purple-800"
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
        className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
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
        className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      >
        {otpErrorMsg}
      </motion.div>
    )}
  </AnimatePresence>




                    </div>
                  </motion.form>
                )}

                {step === "verify" && (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center space-y-8 py-10"
    >
      {/* Success Icon with Pulse */}
      <div className="relative mx-auto w-20 h-20">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-200"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight">Account Created!</h2>
        <p className="text-gray-400">Redirecting you to the login page...</p>
      </div>

      {/* Luxury Progress Loader */}
      <div className="w-48 mx-auto h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="h-full bg-black"
        />
      </div>

      <Button 
        onClick={() => router.push("/login")} 
        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
      >
        Go to Login Now
      </Button>
    </motion.div>
  )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

       {/* Modal Overlay */}
  <AnimatePresence>
    {showModal && (
      <>
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4"
        />
        
        {/* Modal Content */}
      {/* Modal Content */}
  <motion.div 
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 20 }}
    className="fixed inset-0 m-auto z-101 w-[90%] max-w-4xl h-[85vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
  >
    {/* Header - Fixed height */}
    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tighter">Terms & Conditions Policies</h2>
        <p className="text-[10px] text-gray-400 tracking-widest uppercase">MTS Services.inc</p>
      </div>
      <button 
        onClick={() => setShowModal(false)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    {/* Content Area - This now expands (flex-1) */}
    <div className="flex-1 overflow-y-auto p-8 space-y-10 text-left bg-[#FCFCFC]">
      {Object.values(LEGAL_POLICIES).map((policy) => (
        <section key={policy.title} className="border-l-2 border-black pl-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900 mb-4">
            {policy.title}
          </h3>
          <ul className="space-y-4">
            {policy.content.map((point, i) => (
              <li key={i} className="text-sm text-gray-600 leading-relaxed font-medium">
                {point}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>

    {/* Footer - Fixed height */}
    <div className="p-6 border-t border-gray-100 bg-white">
      <button 
        onClick={() => {
      setAcceptedTerms(true); 
      setShowModal(false);    
    }}
        className="w-full py-5 cursor-pointer bg-black text-white rounded-2xl font-bold text-sm tracking-[0.2em] uppercase hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
      >
        Accept & Close
      </button>
    </div>
  </motion.div>
      </>
    )}
  </AnimatePresence>
      </div>
    )
  }