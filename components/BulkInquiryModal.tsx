"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface BulkInquiryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BulkInquiryModal({ isOpen, onClose }: BulkInquiryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    productType: "",
    quantity: "",
    message: ""
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/bulk-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry")
      }

      toast.success("Thank you! We'll contact you soon")
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        productType: "",
        quantity: "",
        message: ""
      })
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to submit inquiry. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r rounded-2xl from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-700">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">
  Inquiry Form Call Back Assistance
</h3>
            <p className="text-xs text-orange-200 mt-1">Get special pricing for bulk purchases</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs text-slate-700 md:col-span-2">
            Enterprise orders get dedicated account support, bulk discount slabs, and faster dispatch options.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Company */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Company / Organization
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your company name"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Product Type
            </label>
          <select
  name="productType"
  value={formData.productType}
  onChange={handleChange}
  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
  required
>
  <option value="" disabled>
    Select Product Type
  </option>
              <option value="laptops">Laptops</option>
              <option value="desktops">Desktops</option>
              <option value="servers">Servers</option>
              <option value="components">Components</option>
              <option value="accessories">Accessories</option>
              <option value="mixed">Mixed Products</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Expected Quantity
            </label>
            <input
              type="text"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="e.g., 50-100 units"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Message */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-2">
              Additional Details
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us more about your requirements..."
              rows={3}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 uppercase tracking-wide"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Inquiry"
              )}
            </button>
          </div>

          </div>

          <p className="text-xs text-slate-500 text-center mt-3">
            We'll get back to you within 24 hours with special bulk pricing and terms
          </p>
        </form>
      </div>
    </div>
  )
}
