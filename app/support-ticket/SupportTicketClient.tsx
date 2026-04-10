"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, Clock3, Loader2, Ticket, XCircle } from "lucide-react"

type SupportTicket = {
  id: string
  ticketNumber: string
  orderNumber: string | null
  subject: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  images?: Array<{ url: string; uploadedAt?: string }> | string[]
}

type SignaturePayload = {
  timestamp: number
  signature: string
  cloudName: string
  apiKey: string
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-700",
}

export default function SupportTicketClient() {
  const { status } = useSession()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [busyTicketId, setBusyTicketId] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") || "")
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const signatureCacheRef = useRef<(SignaturePayload & { fetchedAt: number }) | null>(null)

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false)
      return
    }

    const fetchTickets = async () => {
      try {
        setLoading(true)
        setError("")

        const params = new URLSearchParams()
        if (activeFilter !== "all") {
          params.set("status", activeFilter)
        }

        const orderNumberParam = searchParams.get("orderNumber")
        if (orderNumberParam) {
          params.set("orderNumber", orderNumberParam)
        }

        const query = params.toString() ? `?${params.toString()}` : ""
        const res = await fetch(`/api/supportticket${query}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load support tickets")
        }

        setTickets(Array.isArray(data.tickets) ? data.tickets : [])
      } catch (err: any) {
        setError(err?.message || "Unable to load support tickets")
      } finally {
        setLoading(false)
      }
    }

    void fetchTickets()
  }, [status, activeFilter, searchParams])

  const canCancel = (ticket: SupportTicket) => {
    return ticket.status === "open" || ticket.status === "pending"
  }

  const getCachedSignature = async (): Promise<SignaturePayload> => {
    const cached = signatureCacheRef.current
    if (cached && Date.now() - cached.fetchedAt < 45_000) {
      return cached
    }

    const sigRes = await fetch("/api/cloudinary-signature")
    const sigJson = await sigRes.json().catch(() => ({}))
    if (!sigRes.ok) {
      throw new Error(sigJson?.error || "Failed to get upload signature")
    }

    const payload: SignaturePayload = {
      timestamp: Number(sigJson.timestamp),
      signature: String(sigJson.signature || ""),
      cloudName: String(sigJson.cloudName || ""),
      apiKey: String(sigJson.apiKey || ""),
    }

    signatureCacheRef.current = { ...payload, fetchedAt: Date.now() }
    return payload
  }

  const uploadSupportImage = async (file: File): Promise<string> => {
    const sig = await getCachedSignature()

    const formData = new FormData()
    formData.append("file", file)
    formData.append("api_key", sig.apiKey)
    formData.append("timestamp", String(sig.timestamp))
    formData.append("signature", sig.signature)
    formData.append("folder", "orders")

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.secure_url) {
      throw new Error(data?.error?.message || "Image upload failed")
    }

    return String(data.secure_url)
  }

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const safeFiles = files.slice(0, 5)
    const previews = safeFiles.map((f) => URL.createObjectURL(f))
    setImageFiles((prev) => [...prev, ...safeFiles].slice(0, 5))
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 5))
    e.target.value = ""
  }

  const removeSelectedImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim() || !orderNumber.trim()) {
      setError("Subject, description and order number are required")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const imageUrls = imageFiles.length > 0
        ? await Promise.all(imageFiles.map((file) => uploadSupportImage(file)))
        : []

      const res = await fetch("/api/supportticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          orderNumber: orderNumber.trim(),
          images: imageUrls.map((url) => ({ url })),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create ticket")
      }

      setTickets((prev) => [data as SupportTicket, ...prev])
      setSubject("")
      setDescription("")
      setImageFiles([])
      setImagePreviews([])
      setActiveFilter("all")
      setShowCreateForm(false)
    } catch (err: any) {
      setError(err?.message || "Unable to create support ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const getTicketImageUrls = (ticket: SupportTicket): string[] => {
    if (!Array.isArray(ticket.images)) return []
    return ticket.images
      .map((img) => (typeof img === "string" ? img : img?.url))
      .filter((url): url is string => typeof url === "string" && url.length > 0)
  }

  const handleCancelTicket = async (ticket: SupportTicket) => {
    if (!canCancel(ticket)) return

    setBusyTicketId(ticket.id)
    try {
      const res = await fetch(`/api/supportticket/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Failed to cancel ticket")
      }

      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: "cancelled" } : t)))
    } catch (err: any) {
      setError(err?.message || "Unable to cancel ticket")
    } finally {
      setBusyTicketId("")
    }
  }

  const ticketCountText = useMemo(() => {
    const count = tickets.length
    return count === 1 ? "1 ticket" : `${count} tickets`
  }, [tickets])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading session...
        </div>
      </main>
    )
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <h1 className="text-2xl font-black text-slate-900">Login Required</h1>
            <p className="mt-2 text-sm text-slate-600">Please sign in to view and manage your support tickets.</p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-orange-600 px-5 py-2.5 text-sm font-bold transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">Track Support Tickets</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Check current ticket status, follow outcomes, and cancel tickets anytime while they are still open or pending.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Need Help?</h2>
              <p className="mt-1 text-sm text-slate-600">Create a support ticket when you need assistance.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-orange-600 px-4 py-2 text-sm font-bold"
            >
              <Ticket className="w-4 h-4" />
              {showCreateForm ? "Close Form" : "Create Ticket"}
            </button>
          </div>

          {showCreateForm && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Add issue details and optional images (up to 5).</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Order Number"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-24"
              />

              <div className="mt-3">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  Add Images
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {imagePreviews.map((src, idx) => (
                      <div key={`${src}-${idx}`} className="relative">
                        <img src={src} alt={`Selected ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute top-1 right-1 rounded-full bg-black/70 text-white text-xs px-1.5"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreateTicket}
                disabled={submitting}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white hover:bg-orange-600 px-4 py-2 text-sm font-bold disabled:opacity-70"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? "Creating..." : "Submit Ticket"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { key: "all", label: "All" },
            { key: "open", label: "Open" },
            { key: "pending", label: "Pending" },
            { key: "resolved", label: "Resolved" },
            { key: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${
                activeFilter === f.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-semibold text-slate-500">{ticketCountText}</span>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm text-slate-600 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading support tickets...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-medium">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-black text-slate-900">No Tickets Found</h2>
            <p className="mt-1 text-sm text-slate-600">You have no support tickets in this filter.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket Number</p>
                    <h2 className="text-lg font-black text-slate-900">{ticket.ticketNumber}</h2>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-700"}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Subject</p>
                    <p className="font-semibold text-slate-800">{ticket.subject}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Order Number</p>
                    <p className="font-semibold text-slate-800">{ticket.orderNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p className="font-semibold text-slate-800 inline-flex items-center gap-1.5"><Clock3 className="w-4 h-4" />{new Date(ticket.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Last Update</p>
                    <p className="font-semibold text-slate-800">{new Date(ticket.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{ticket.description}</p>
                </div>

                {getTicketImageUrls(ticket).length > 0 && (
                  <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Images</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {getTicketImageUrls(ticket).map((url, idx) => (
                        <a key={`${ticket.id}-${idx}`} href={url} target="_blank" rel="noreferrer" className="block">
                          <img src={url} alt={`Ticket ${ticket.ticketNumber} image ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {canCancel(ticket) ? (
                    <button
                      type="button"
                      onClick={() => handleCancelTicket(ticket)}
                      disabled={busyTicketId === ticket.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 text-sm font-bold transition-colors disabled:opacity-70"
                    >
                      {busyTicketId === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Cancel Ticket
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {ticket.status === "resolved" ? "Resolved" : "Already Cancelled"}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
