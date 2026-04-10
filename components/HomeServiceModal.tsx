"use client"

import { useState } from "react"
import { X, Loader2, MapPin, Phone, Mail } from "lucide-react"
import toast from "react-hot-toast"

interface HomeServiceModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function HomeServiceModal({ isOpen, onClose }: HomeServiceModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceType: "Laptop Screen Repair",
    address: "",
    city: "",
    zipcode: "",
    deviceModel: "",
    issueDescription: "",
    preferredDate: ""
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      toast.error("Please fill in all required fields")
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

      toast.success("✅ Service booking confirmed! We'll contact you shortly to confirm the appointment.")
      setFormData({
        name: "",
        email: "",
        phone: "",
        serviceType: "Laptop Screen Repair",
        address: "",
        city: "",
        zipcode: "",
        deviceModel: "",
        issueDescription: "",
        preferredDate: ""
      })
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to book service. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto border border-gray-100 animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-blue-500 to-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black tracking-tight">🔧 Book Home Service</h3>
            <p className="text-xs opacity-90 mt-1">Professional repair & maintenance at your home</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {SERVICES.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          {/* Device Model */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Device Model
            </label>
            <input
              type="text"
              name="deviceModel"
              value={formData.deviceModel}
              onChange={handleChange}
              placeholder="e.g., Dell XPS 13, HP Pavilion 15"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Issue Description */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Issue Description
            </label>
            <textarea
              name="issueDescription"
              value={formData.issueDescription}
              onChange={handleChange}
              placeholder="Describe the issue with your device..."
              rows={2}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street address"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* City & Zipcode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Your city"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
                Pin Code
              </label>
              <input
                type="text"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleChange}
                placeholder="000000"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preferred Date */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">
              Preferred Service Date
            </label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Booking...
              </>
            ) : (
              "Book Service Now"
            )}
          </button>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2 text-xs">
            <p className="font-bold text-blue-900">📞 Need to book immediately?</p>
            <div className="space-y-1 text-blue-800">
              <p>Call: <strong>+91 87430 94186</strong></p>
              <p>We're available Mon-Sat, 10 AM - 6 PM</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
