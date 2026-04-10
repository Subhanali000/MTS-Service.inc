"use client"

import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, Clock3, Mail, MapPin, Phone, ShieldCheck } from "lucide-react"

type ContactForm = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const INITIAL_FORM: ContactForm = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: ""
}

const FAQS = [
  {
    q: "How quickly will I get a reply?",
    a: "Most queries are answered within 2 to 6 business hours, depending on request complexity."
  },
  {
    q: "Can I book service from this page?",
    a: "Yes. You can use the Book Service button to submit a detailed service request instantly."
  },
  {
    q: "Do you support business and bulk requests?",
    a: "Yes, we handle corporate and bulk service requirements with custom support and pricing."
  }
]

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(INITIAL_FORM)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    const phoneOk = !form.phone || /^[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ""))
    return form.name.trim().length >= 2 && emailOk && form.message.trim().length >= 10 && phoneOk
  }, [form])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!isValid) {
      setError("Please fill all required fields correctly before sending.")
      return
    }

    const subject = encodeURIComponent(form.subject || "New inquiry from website")
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone || "N/A"}\n\nMessage:\n${form.message}`
    )

    window.location.href = `mailto:info@mtsservices.com?subject=${subject}&body=${body}`
    setSuccess("Your email draft is ready. Please click send in your mail app.")
    setForm(INITIAL_FORM)
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Contact Us
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Contact our team for service assistance, order support, warranty queries, or business requirements.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-linear-to-r from-slate-50 to-orange-50 px-6 md:px-8 py-5 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-900">Send Us a Message</h2>
                <p className="text-sm text-slate-600 mt-1">Share your issue and we will guide you with the fastest solution.</p>
              </div>

              <div className="px-6 md:px-8 py-7 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Full Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Subject</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Repair inquiry / Order support / Bulk request"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={5}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    placeholder="Tell us about your issue or requirement in detail..."
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-700">{success}</p>}

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 transition-colors disabled:opacity-60"
                  disabled={!isValid}
                >
                  Send Message
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-slate-500">
                  This form opens your email app with all details pre-filled to ensure fast support handling.
                </p>
              </div>
            </form>
          </div>

          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Contact Information</h3>
              <div className="mt-4 space-y-3 text-sm">
                <a href="tel:+918743094186" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                  <Phone className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-slate-800">+91 87430 94186</span>
                </a>
                <a href="mailto:info@mtsservices.com" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-slate-800">info@mtsservices.com</span>
                </a>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
                  <span className="font-semibold text-slate-800">Mumbai, Delhi, Patna, India</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Business Hours</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-orange-600" /> Mon - Sat: 10:00 AM - 6:00 PM</p>
                <p className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-orange-600" /> Sunday: Emergency support only</p>
                <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> Booking confirmation within 2 hours</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Support Commitment</h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                We prioritize clear communication, timely updates, and practical solutions for every support request.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14">
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <iframe
            title="MTS Services Location"
            src="https://www.google.com/maps?q=New+Delhi,+India&output=embed"
            className="w-full h-64 md:h-80 border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-20">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {FAQS.map((faq) => (
            <article key={faq.q} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">{faq.q}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
