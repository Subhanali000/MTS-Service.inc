// app/api/delivery/serviceability/route.ts
import { NextRequest, NextResponse } from "next/server"
import { checkServiceability } from "@/lib/shiprocket"
import { getPickupLocation } from "@/lib/config"

const DEBUG_LOGS = process.env.NODE_ENV !== "production"

type TopRate = { courier: string; rate: number; etd?: string | null }

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric
}

function parseWeightKg(raw: string | null): number {
  const parsed = toPositiveNumber(raw)
  if (parsed <= 0) {
    throw new Error("Weight parameter is required and must be a positive number (in kg)")
  }
  return parsed
}

function sortByLowestRate<T extends { rate?: number }>(couriers: T[]): T[] {
  return [...couriers].sort((a, b) => {
    const aRate = toPositiveNumber(a.rate)
    const bRate = toPositiveNumber(b.rate)
    if (aRate === 0 && bRate === 0) return 0
    if (aRate === 0) return 1
    if (bRate === 0) return -1
    return aRate - bRate
  })
}

function toTopRates(couriers: Array<{ courier_name?: string; rate?: number; estimated_delivery?: string | null }>): TopRate[] {
  return sortByLowestRate(couriers).slice(0, 5).map(courier => ({
    courier: courier.courier_name || "Unknown Courier",
    rate: Math.round(toPositiveNumber(courier.rate)),
    etd: courier.estimated_delivery ?? null,
  }))
}

function getLowestRate(rates: TopRate[] | null | undefined): number | null {
  if (!Array.isArray(rates) || rates.length === 0) return null
  const numericRates = rates.map(rate => toPositiveNumber(rate.rate)).filter(rate => rate > 0)
  if (numericRates.length === 0) return null
  return Math.min(...numericRates)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pincode = searchParams.get("pincode")?.trim()
  const codParam = (searchParams.get("cod") ?? "false").toLowerCase()
  const cod = codParam === "true" || codParam === "1"
  
  // Weight is MANDATORY - throw error if missing or invalid
  const weightParam = searchParams.get("weight")
  let totalWeightKg: number
  
  try {
    totalWeightKg = parseWeightKg(weightParam)
  } catch (err) {
    return NextResponse.json(
      { error: "Weight is required. Pass ?weight=<kg> with a positive number" },
      { status: 400 }
    )
  }

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 })
  }

  let pickupLocation: Awaited<ReturnType<typeof getPickupLocation>>
  try {
    pickupLocation = await getPickupLocation()
  } catch (error) {
    console.error("[Shiprocket Serviceability] Pickup lookup failed", error)
    return NextResponse.json(
      { error: "Pickup point is not configured" },
      { status: 500 }
    )
  }

  const result = await checkServiceability({
    pickup_postcode:   pickupLocation.pincode,
    delivery_postcode: pincode,
    weight:            totalWeightKg,
    cod,
  })

  if (!result.available) {
    return NextResponse.json({ available: false, error: result.error }, { status: 200 })
  }

  // Separate express vs standard
  // Express = air (is_surface: false), Standard = surface (is_surface: true)
  const express  = sortByLowestRate(result.couriers.filter(c => !c.is_surface)).slice(0, 3)
  const standard = sortByLowestRate(result.couriers.filter(c => c.is_surface)).slice(0, 3)

  let codPreview: {
    available: boolean
    topRates: Array<{ courier: string; rate: number; etd?: string | null }>
  } | null = null

  if (!cod) {
    const codResult = await checkServiceability({
      pickup_postcode:   pickupLocation.pincode,
      delivery_postcode: pincode,
      weight:            totalWeightKg,
      cod:               true,
    })

    codPreview = codResult.available
      ? {
          available: true,
          topRates: toTopRates(codResult.couriers),
        }
      : {
          available: false,
          topRates: [],
        }
  }

  const standardTopRates = toTopRates(standard)
  const expressTopRates = toTopRates(express)
  const lowestStandardRate = getLowestRate(standardTopRates)
  const lowestExpressRate = getLowestRate(expressTopRates)
  const lowestCodRate = getLowestRate(codPreview?.topRates)
  const standardAmount = lowestStandardRate ?? lowestExpressRate ?? 0
  const expressAmount = lowestExpressRate ?? standardAmount
  const expressSurchargeAmount = Math.max(0, expressAmount - standardAmount)

  if (DEBUG_LOGS) {
    console.log("[Shiprocket Serviceability Debug]", {
      pincode,
      cod,
      totalWeightKg,
      pickupPincode: pickupLocation.pincode,
      pickupAddress: pickupLocation.addressLine1,
      totalCourierOptions: result.couriers.length,
      standardTopRates,
      expressTopRates,
      lowestStandardRate,
      lowestExpressRate,
      lowestCodRate,
      standardAmount,
      expressAmount,
      expressSurchargeAmount,
      codPreview,
    })
  }

  return NextResponse.json({
    available: true,
    totalWeightKg,
    standardTopRates,
    expressTopRates,
    lowestStandardRate,
    lowestExpressRate,
    lowestCodRate,
    standardAmount,
    expressAmount,
    expressSurchargeAmount,
    express,
    standard,
    codPreview,
    all: result.couriers,
  })
}