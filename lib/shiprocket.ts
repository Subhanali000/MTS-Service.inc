// lib/shiprocket.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shiprocket API wrapper
// Docs: https://apidocs.shiprocket.in/
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://apiv2.shiprocket.in/v1/external"

// ─── Token cache (in-memory, refreshed every 9 days) ─────────────────────────
let cachedToken: string | null = null
let tokenExpiry: number        = 0

export async function getShiprocketToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  })

  if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status}`)
  const data = await res.json()

  cachedToken = data.token
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000   // 9 days
  return cachedToken!
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CourierOption = {
  courier_company_id:   number
  courier_name:         string
  rate:                 number
  estimated_delivery:   string   // e.g. "2024-03-15"
  etd:                  string   // human label e.g. "3 Days"
  min_weight:           number
  is_surface:           boolean
  cod:                  boolean
  rating:               number
  delivery_performance: number
}

export type ServiceabilityResult =
  | { available: true;  couriers: CourierOption[]; error?: never }
  | { available: false; couriers?: never; error: string }

// ─── Check serviceability + get courier options ───────────────────────────────
export async function checkServiceability(params: {
  pickup_postcode:    string
  delivery_postcode:  string
  weight:             number   // kg
  cod:                boolean
}): Promise<ServiceabilityResult> {
  try {
    const token = await getShiprocketToken()

    const url = new URL(`${BASE}/courier/serviceability/`)
    url.searchParams.set("pickup_postcode",   params.pickup_postcode)
    url.searchParams.set("delivery_postcode", params.delivery_postcode)
    url.searchParams.set("weight",            String(params.weight))
    url.searchParams.set("cod",               params.cod ? "1" : "0")

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return { available: false, error: `HTTP ${res.status}` }

    const data = await res.json()

    if (!data?.data?.available_courier_companies?.length) {
      return { available: false, error: "No couriers available for this pincode" }
    }

    const couriers: CourierOption[] = data.data.available_courier_companies
      .map((c: any) => ({
        courier_company_id:   c.courier_company_id,
        courier_name:         c.courier_name,
        rate:                 c.rate,
        estimated_delivery:   c.etd,           // ISO date string
        etd:                  c.etd_formatted ?? c.etd,
        min_weight:           c.min_weight,
        is_surface:           c.is_surface === 1,
        cod:                  c.cod === 1,
        rating:               c.rating ?? 0,
        delivery_performance: c.delivery_performance ?? 0,
      }))
      .sort((a: CourierOption, b: CourierOption) => a.rate - b.rate)

    return { available: true, couriers }
  } catch (err: any) {
    return { available: false, error: err?.message ?? "Unknown error" }
  }
}

// ─── Parse ETD string into a Date ────────────────────────────────────────────
// Shiprocket returns strings like "2024-03-15T00:00:00" or "3-4 Days"
export function parseEtd(etd: string): { from: Date; to: Date } | null {
  // ISO date format
  if (/^\d{4}-\d{2}-\d{2}/.test(etd)) {
    const d = new Date(etd)
    const to = new Date(etd)
    to.setDate(to.getDate() + 1)
    return { from: d, to }
  }

  // "3-4 Days" format
  const rangeMatch = etd.match(/(\d+)-(\d+)\s*days?/i)
  if (rangeMatch) {
    const from = new Date(); from.setDate(from.getDate() + parseInt(rangeMatch[1]))
    const to   = new Date(); to.setDate(to.getDate()   + parseInt(rangeMatch[2]))
    return { from, to }
  }

  // "3 Days" format
  const singleMatch = etd.match(/(\d+)\s*days?/i)
  if (singleMatch) {
    const n    = parseInt(singleMatch[1])
    const from = new Date(); from.setDate(from.getDate() + n)
    const to   = new Date(); to.setDate(to.getDate()   + n + 1)
    return { from, to }
  }

  return null
}

export function formatDateRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }
  return `${from.toLocaleDateString("en-IN", opts)} – ${to.toLocaleDateString("en-IN", opts)}`
}

// ─── Get tracking info for an order ──────────────────────────────────────────
export async function getTrackingInfo(shipmentId: string): Promise<{
  current_status: string
  delivered_date?: string
  activities: { date: string; activity: string; location: string }[]
} | null> {
  try {
    const token = await getShiprocketToken()
    const res   = await fetch(`${BASE}/courier/track/shipment/${shipmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.tracking_data ?? null
  } catch {
    return null
  }
}