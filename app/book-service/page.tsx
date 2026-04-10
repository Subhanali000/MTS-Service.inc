"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Clock,MapPin,
  Shield,
  Award,
  Search,
  User,
  Zap,
  Wrench,
  HeadphonesIcon,
  Info,
  AlertCircle
} from "lucide-react"
import toast from "react-hot-toast"

const ServiceLocationMap = dynamic(() => import("./ServiceLocationMap"), { ssr: false })

type LatLng = {
  lat: number
  lng: number
}

const DEFAULT_MAP_CENTER: LatLng = {
  lat: 28.6139,
  lng: 77.209
}

const SERVICES = [
  "Laptop Screen Repair",
  "Hardware Upgrades & SSD",
  "Virus Removal & Software Fix",
  "Keyboard & Battery Replacement",
  "Desktop PC Repair",
  "Data Recovery Services",
  "Thermal Paste Replacement",
  "Motherboard Repair",
  "Power Supply Replacement",
  "General Maintenance & Cleaning"
]

const SERVICE_PRICES: Record<string, string> = {
  "Laptop Screen Repair": "₹3,000 - ₹8,000",
  "Hardware Upgrades & SSD": "₹2,000 - ₹15,000",
  "Virus Removal & Software Fix": "₹500 - ₹2,000",
  "Keyboard & Battery Replacement": "₹1,500 - ₹4,000",
  "Desktop PC Repair": "₹1,000 - ₹5,000",
  "Data Recovery Services": "₹2,000 - ₹10,000",
  "Thermal Paste Replacement": "₹800 - ₹2,000",
  "Motherboard Repair": "₹3,000 - ₹12,000",
  "Power Supply Replacement": "₹1,500 - ₹4,000",
  "General Maintenance & Cleaning": "₹500 - ₹1,500"
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "Laptop Screen Repair": "Professional LCD/LED screen replacement with genuine parts",
  "Hardware Upgrades & SSD": "RAM, SSD, and HDD upgrades for better performance",
  "Virus Removal & Software Fix": "Complete malware removal and OS optimization",
  "Keyboard & Battery Replacement": "Original keyboard and battery replacements",
  "Desktop PC Repair": "Complete desktop diagnostics and repair services",
  "Data Recovery Services": "Professional data recovery from damaged drives",
  "Thermal Paste Replacement": "Cooling system maintenance and thermal paste renewal",
  "Motherboard Repair": "Expert motherboard diagnostics and chip-level repair",
  "Power Supply Replacement": "Quality power supply replacement and testing",
  "General Maintenance & Cleaning": "Deep cleaning and performance optimization"
}

function BookServiceContent() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceType: "",
    address: "",
    city: "",
    zipcode: "",
    latitude: "",
    longitude: "",
    deviceModel: "",
    issueDescription: "",
    preferredDate: "",
    preferredTime: "morning"
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [location, setLocation] = useState<LatLng | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_MAP_CENTER)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  useEffect(() => {
    const selectedService = searchParams.get("service")
    if (!selectedService || !SERVICES.includes(selectedService)) {
      return
    }

    setFormData(prev => ({
      ...prev,
      serviceType: selectedService
    }))
  }, [searchParams])

  // Set minimum date to tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateString = minDate.toISOString().split('T')[0]

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email"
      case "phone":
        return /^[6-9]\d{9}$/.test(value.replace(/[\s-]/g, "")) ? "" : "Please enter a valid 10-digit mobile number"
      case "zipcode":
        return value && /^\d{6}$/.test(value) ? "" : value ? "Invalid PIN code" : ""
      case "name":
        return value.trim().length >= 2 ? "" : "Name must be at least 2 characters"
      case "address":
        return value.trim().length >= 10 ? "" : "Please provide a complete address"
      default:
        return ""
    }
  }
  const updateLocationFromCoordinates = async (lat: number, lng: number) => {
    setLocation({ lat, lng })
    setMapCenter({ lat, lng })

    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }))

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      if (!response.ok) return

      const data = await response.json()
      const address = data?.address ?? {}
      const resolvedCity = address.city || address.town || address.village || address.state_district || ""
      const rawPostcode = typeof address.postcode === "string" ? address.postcode.replace(/\D/g, "").slice(0, 6) : ""
      const resolvedAddress = typeof data?.display_name === "string" ? data.display_name : ""

      setFormData(prev => ({
        ...prev,
        address: resolvedAddress || prev.address,
        city: resolvedCity || prev.city,
        zipcode: rawPostcode || prev.zipcode,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6)
      }))
    } catch {
      // Keep coordinates even if reverse geocoding fails.
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser")
      return
    }

    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        await updateLocationFromCoordinates(latitude, longitude)
        setIsDetectingLocation(false)
        toast.success("Current location detected")
      },
      () => {
        setIsDetectingLocation(false)
        toast.error("Unable to retrieve location. Please pin it manually on map.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleMapLocationSelect = (lat: number, lng: number) => {
    void updateLocationFromCoordinates(lat, lng)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = "Name is required"
    else if (formData.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters"
    
    if (!formData.email) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format"
    
    if (!formData.phone) newErrors.phone = "Phone number is required"
    else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/[\s-]/g, ""))) newErrors.phone = "Invalid phone number"
    
    if (!formData.address.trim()) newErrors.address = "Address is required"
    else if (formData.address.trim().length < 10) newErrors.address = "Please provide a complete address"

    if (!location) newErrors.location = "Please pin your location on map or use current location"
    
    if (formData.zipcode && !/^\d{6}$/.test(formData.zipcode)) newErrors.zipcode = "Invalid PIN code"
    
    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    const allFields = Object.keys(formData)
    const touchedFields = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    setTouched(touchedFields)

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before submitting")
      // Scroll to first error
      const firstError = Object.keys(newErrors)[0]
      const element = document.getElementsByName(firstError)[0]
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/home-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to book service")
      }

      setSubmitted(true)
      toast.success("Service booking confirmed!")
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Reset form after showing success
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          serviceType: "Laptop Screen Repair",
          address: "",
          city: "",
          zipcode: "",
          latitude: "",
          longitude: "",
          deviceModel: "",
          issueDescription: "",
          preferredDate: "",
          preferredTime: "morning"
        })
        setLocation(null)
        setMapCenter(DEFAULT_MAP_CENTER)
        setSubmitted(false)
        setErrors({})
        setTouched({})
      }, 5000)
    } catch (error) {
      console.error(error)
      toast.error("Failed to book service. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30"></div>
              <div className="relative bg-linear-to-br from-green-400 to-green-600 p-8 rounded-full shadow-2xl">
                <CheckCircle2 size={64} className="text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Booking Confirmed! 🎉
          </h1>
          
          <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-xl mx-auto">
            Thank you for choosing our service. Our expert technician will contact you within <strong className="text-green-600">2 hours</strong> to confirm your appointment and provide an accurate quote.
          </p>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-lg">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Booking Summary</h3>
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Service</span>
                <span className="text-sm font-bold text-gray-900 text-right max-w-xs">{formData.serviceType}</span>
              </div>
              <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Contact</span>
                <span className="text-sm font-semibold text-gray-900">{formData.phone}</span>
              </div>
              <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-semibold text-gray-900 break-all">{formData.email}</span>
              </div>
              {formData.preferredDate && (
                <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Preferred Date</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(formData.preferredDate).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Est. Price</span>
                <span className="text-sm font-bold text-orange-600">{SERVICE_PRICES[formData.serviceType as keyof typeof SERVICE_PRICES]}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 text-left">
                <strong className="text-gray-900">What's Next?</strong><br />
                Our team will call you to confirm the appointment time and provide an exact quote after understanding your device's condition. Please keep your device ready for inspection.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Back to Home
            </Link>
            <button
              onClick={() => {
                setSubmitted(false)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 px-8 rounded-xl transition-all border-2 border-gray-200"
            >
              Book Another Service
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-6 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2 hover:opacity-90 transition-opacity group"
              aria-label="Go back to home"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-semibold">Back</span>
            </Link>
           <h1 className="flex items-center gap-2 text-xl md:text-2xl font-black tracking-tight">
  <Wrench className="w-5 h-5 md:w-6 md:h-6" />
  Book Home Service
</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-12 md:py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            Professional Repair Service<br className="hidden sm:block" />
            <span className="bg-linear-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent"> at Your Doorstep</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Expert technicians, transparent pricing, and guaranteed workmanship. Get your device fixed without leaving home.
          </p>
          
          {/* Trust Indicators */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Shield className="mx-auto mb-2 text-orange-500" size={24} />
              <p className="text-xs font-bold text-gray-900">6 Month Warranty</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Award className="mx-auto mb-2 text-orange-500" size={24} />
              <p className="text-xs font-bold text-gray-900">Certified Experts</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Zap className="mx-auto mb-2 text-orange-500" size={24} />
              <p className="text-xs font-bold text-gray-900">Same Day Service</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <HeadphonesIcon className="mx-auto mb-2 text-orange-500" size={24} />
              <p className="text-xs font-bold text-gray-900">24/7 Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              
              {/* Form Header */}
              <div className="bg-linear-to-r from-slate-50 to-orange-50 px-6 md:px-8 py-6 border-b border-slate-200">
                <h3 className="text-xl font-black text-gray-900">Service Request Form</h3>
                <p className="text-sm text-gray-600 mt-1">Fill in your details and we'll get back to you shortly</p>
              </div>

              <div className="px-6 md:px-8 py-8 space-y-8">
                {/* Personal Information */}
                <fieldset>
                  <legend className="text-base font-black text-gray-900 mb-6 flex items-center gap-3">
                    <div className="bg-orange-100 p-2.5 rounded-lg">
                       <User className="w-5 h-5 text-gray-700" />
                    </div>
                    <span>Personal Information</span>
                  </legend>
                  
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Full Name <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="John Doe"
                        className={`w-full px-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.name && touched.name
                            ? 'border-red-300 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        required
                        aria-invalid={errors.name && touched.name ? 'true' : 'false'}
                        aria-describedby={errors.name && touched.name ? 'name-error' : undefined}
                      />
                      {errors.name && touched.name && (
                        <p id="name-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.name}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Email Address <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="john@example.com"
                        className={`w-full px-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.email && touched.email
                            ? 'border-red-300 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        required
                        aria-invalid={errors.email && touched.email ? 'true' : 'false'}
                        aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                      />
                      {errors.email && touched.email && (
                        <p id="email-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="phone" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Phone Number <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="9876543210"
                      className={`w-full px-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        errors.phone && touched.phone
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      required
                      aria-invalid={errors.phone && touched.phone ? 'true' : 'false'}
                      aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
                    />
                    {errors.phone && touched.phone && (
                      <p id="phone-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </fieldset>

                <div className="border-t border-gray-100"></div>

                {/* Service Details */}
                <fieldset>
                  <legend className="text-base font-black text-gray-900 mb-6 flex items-center gap-3">
                    <div className="bg-orange-100 p-2.5 rounded-lg flex items-center justify-center">
  <Search className="w-5 h-5 text-orange-600" />
</div>
                    <span>Service Details</span>
                  </legend>
                  
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="serviceType" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Service Type <span className="text-red-500" aria-label="required">*</span>
                      </label>
                     <select
  id="serviceType"
  name="serviceType"
  value={formData.serviceType}
  onChange={handleChange}
  className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
  required
>
  <option value="" disabled>
    Select a service
  </option>

  {SERVICES.map(service => (
    <option key={service} value={service}>
      {service}
    </option>
  ))}
</select>
                      <p className="mt-2 text-xs text-gray-500">
                        {SERVICE_DESCRIPTIONS[formData.serviceType]}
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="deviceModel" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Device Model
                      </label>
                      <input
                        type="text"
                        id="deviceModel"
                        name="deviceModel"
                        value={formData.deviceModel}
                        onChange={handleChange}
                        placeholder="e.g., Dell XPS 13, HP Pavilion 15"
                        className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Help us prepare the right parts
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="issueDescription" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Describe Your Issue
                    </label>
                    <textarea
                      id="issueDescription"
                      name="issueDescription"
                      value={formData.issueDescription}
                      onChange={handleChange}
                      placeholder="What's wrong with your device? Be as detailed as possible (e.g., screen shows lines, laptop won't turn on, keyboard keys not working)..."
                      rows={4}
                      className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Detailed description helps our technicians come prepared
                    </p>
                  </div>
                </fieldset>

                <div className="border-t border-gray-100"></div>

                {/* Location & Schedule */}
                <fieldset>
                  <legend className="text-base font-black text-gray-900 mb-6 flex items-center gap-3">
                    <div className="bg-orange-100 p-2.5 rounded-lg">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Service Location & Schedule</span>
                  </legend>
                  
                  <div className="mb-5">
                    <label htmlFor="address" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Complete Address <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isDetectingLocation}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold border border-orange-200 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition disabled:opacity-60"
                      >
                        {isDetectingLocation ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        {isDetectingLocation ? "Detecting Location..." : "Use Current Location"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Tap anywhere on the map to pin exact location for technician visit.
                    </p>
                    <ServiceLocationMap
                      center={mapCenter}
                      markerPosition={location}
                      onPickLocation={handleMapLocationSelect}
                    />
                    {location && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">
                          Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-orange-600 hover:underline"
                        >
                          View pinned location in Google Maps
                        </a>
                      </div>
                    )}
                    {errors.location && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.location}
                      </p>
                    )}
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="House/Flat No., Street, Landmark"
                      className={`w-full px-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        errors.address && touched.address
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      required
                      aria-invalid={errors.address && touched.address ? 'true' : 'false'}
                      aria-describedby={errors.address && touched.address ? 'address-error' : undefined}
                    />
                    {errors.address && touched.address && (
                      <p id="address-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.address}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="city" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Your city"
                        className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="zipcode" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        id="zipcode"
                        name="zipcode"
                        value={formData.zipcode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="226001"
                        maxLength={6}
                        className={`w-full px-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.zipcode && touched.zipcode
                            ? 'border-red-300 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        aria-invalid={errors.zipcode && touched.zipcode ? 'true' : 'false'}
                        aria-describedby={errors.zipcode && touched.zipcode ? 'zipcode-error' : undefined}
                      />
                      {errors.zipcode && touched.zipcode && (
                        <p id="zipcode-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.zipcode}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="preferredDate" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        id="preferredDate"
                        name="preferredDate"
                        value={formData.preferredDate}
                        onChange={handleChange}
                        min={minDateString}
                        className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="preferredTime" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Preferred Time Slot
                    </label>
                    <select
                      id="preferredTime"
                      name="preferredTime"
                      value={formData.preferredTime}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="morning">Morning (10 AM - 1 PM)</option>
                      <option value="afternoon">Afternoon (2 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 8 PM)</option>
                    </select>
                  </div>
                </fieldset>

                <div className="border-t border-gray-100"></div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Book Service Now
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  By submitting this form, you agree to our <a href="/terms-of-service" className="text-orange-600 hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-orange-600 hover:underline">Privacy Policy</a>
                </p>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-24 shadow-md">
  
  {/* Header */}
  <div className="flex items-center justify-between mb-5">
    <h4 className="text-sm font-bold text-gray-800 tracking-wide">
      Your Selection
    </h4>
    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-semibold">
      Summary
    </span>
  </div>

  {/* Service Card */}
  <div className="bg-linear-to-br from-orange-50 to-white border border-orange-100 rounded-xl p-5 mb-5">
    
    {/* Service Name */}
    <p className="text-base font-bold text-gray-900">
      {formData.serviceType || "No service selected"}
    </p>

    {/* Divider */}
    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
      <span className="text-sm text-gray-500 font-medium">
        Estimated Price
      </span>

      <span className="text-lg font-extrabold text-orange-600">
        {formData.serviceType
          ? SERVICE_PRICES[formData.serviceType as keyof typeof SERVICE_PRICES]
          : "--"}
      </span>
    </div>
  </div>

  {/* Info Box */}
  <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
    
    {/* Icon */}
    <div className="bg-orange-100 p-2 rounded-lg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-orange-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
        />
      </svg>
    </div>

    {/* Text */}
    <p className="text-xs text-gray-700 leading-relaxed">
      Final pricing will be confirmed after inspection by our technician.
    </p>
  </div>
</div>

            {/* Why Choose Us */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest mb-5">Why Choose Us?</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Expert Technicians</p>
                    <p className="text-xs text-gray-600">10+ years certified professionals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Transparent Pricing</p>
                    <p className="text-xs text-gray-600">No hidden charges, upfront quotes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">6 Month Warranty</p>
                    <p className="text-xs text-gray-600">All repairs fully guaranteed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg shrink-0">
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Same-Day Service</p>
                    <p className="text-xs text-gray-600">Quick turnaround available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest mb-5">Need Help?</h4>
              <div className="space-y-3">
                <a 
                  href="tel:+918743094186" 
                  className="flex items-center gap-3 hover:bg-gray-50 p-3 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="bg-blue-100 p-2.5 rounded-lg">
                    <Phone size={18} className="text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">+91 87430 94186</p>
                    <p className="text-xs text-gray-500">Mon-Sat, 10 AM - 6 PM</p>
                  </div>
                </a>
                
                <a 
                  href="mailto:service@mtsservice.com" 
                  className="flex items-center gap-3 hover:bg-gray-50 p-3 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="bg-blue-100 p-2.5 rounded-lg">
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">service@mtsservice.com</p>
                    <p className="text-xs text-gray-500">Response within 24 hours</p>
                  </div>
                </a>
                
                <div className="flex items-center gap-3 p-3">
                  <div className="bg-blue-100 p-2.5 rounded-lg">
                    <Clock size={18} className="text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">Quick Response</p>
                    <p className="text-xs text-gray-500">Confirmation within 2 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="bg-linear-to-b from-slate-50 to-white py-16 md:py-20 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-gray-600">Everything you need to know about our service</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">How long does a repair take?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Most repairs are completed within 24-48 hours. Complex repairs may take up to 3-5 days. We'll provide an accurate timeline after diagnosis and keep you updated throughout the process.</p>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">Do you provide warranty?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Yes! All repairs come with a comprehensive 6-month warranty on both parts and labor. If the same issue reoccurs within the warranty period, we'll fix it free of charge.</p>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">What areas do you service?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">We currently serve major cities including Delhi NCR, Bangalore, Mumbai, Chennai, Hyderabad, Pune, and Lucknow. Enter your PIN code during booking to verify service availability in your area.</p>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">Is there a service charge?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">We charge a ₹200 diagnostic fee for initial inspection, which is fully waived if you proceed with the repair. Absolutely no hidden charges - you'll know the exact cost before we start any work.</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">What if I'm not satisfied?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Your satisfaction is our priority. If you're not happy with the repair, we'll work with you to make it right. We also offer a 30-day satisfaction guarantee on all services.</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-gray-900 mb-3 text-lg">Do you use genuine parts?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Yes, we prioritize using genuine OEM parts whenever possible. For older devices where OEM parts aren't available, we use high-quality certified alternatives and inform you beforehand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl md:text-3xl font-black mb-3">Still have questions?</h3>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">Our support team is here to help. Contact us and we'll get back to you within 2 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:+918743094186" 
              className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Phone size={18} />
              Call Now
            </a>
            <a 
              href="mailto:service@mtsservice.com" 
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 px-8 rounded-xl hover:bg-white/20 transition-colors border border-orange-300/40"
            >
              <Mail size={18} />
              Email Us
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function BookServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading service form...</div>}>
      <BookServiceContent />
    </Suspense>
  )
}
