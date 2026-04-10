// app/api/delivery/track/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getTrackingInfo } from "@/lib/shiprocket"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const shipmentId = searchParams.get("shipmentId")

  if (!shipmentId) {
    return NextResponse.json({ error: "shipmentId required" }, { status: 400 })
  }

  const data = await getTrackingInfo(shipmentId)
  if (!data) {
    return NextResponse.json({ error: "Tracking info not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}