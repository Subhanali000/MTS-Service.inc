type PricedItem = {
  price?: number | null
  finalPrice?: number | null
  discountType?: string | null
  discountPercent?: number | null
}

export type GstInclusivePriceSnapshot = {
  originalPrice: number
  discountAmount: number
  finalPrice: number
  gstRate: number
  gstAmount: number
  basePrice: number
}

const DEFAULT_STANDARD_INCLUDED_DELIVERY_CHARGE = 499
const DEFAULT_GST_RATE = 18

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function getStandardIncludedDeliveryCharge(): number {
  const raw = process.env.NEXT_PUBLIC_STANDARD_INCLUDED_DELIVERY_CHARGE
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_STANDARD_INCLUDED_DELIVERY_CHARGE
  return Math.round(parsed)
}

export function calculateGstInclusivePrice(
  originalPrice: number,
  discountAmount: number,
  gstRate = DEFAULT_GST_RATE
): GstInclusivePriceSnapshot {
  const normalizedOriginalPrice = roundCurrency(Math.max(0, Number(originalPrice ?? 0)))
  const normalizedDiscount = roundCurrency(Math.max(0, Number(discountAmount ?? 0)))
  const normalizedGstRate = normalizePercent(Number(gstRate ?? DEFAULT_GST_RATE))
  const finalPrice = roundCurrency(Math.max(0, normalizedOriginalPrice - normalizedDiscount))
  const gstAmount = roundCurrency((finalPrice * normalizedGstRate) / (100 + normalizedGstRate))
  const basePrice = roundCurrency(Math.max(0, finalPrice - gstAmount))

  return {
    originalPrice: normalizedOriginalPrice,
    discountAmount: normalizedDiscount,
    finalPrice,
    gstRate: normalizedGstRate,
    gstAmount,
    basePrice,
  }
}

export function getCatalogBasePrice(item: PricedItem): number {
  const price = Math.max(0, Number(item.price ?? 0))
  const finalPrice = Math.max(0, Number(item.finalPrice ?? 0))
  const discountType = String(item.discountType ?? "").toUpperCase()
  const discountPercent = normalizePercent(Number(item.discountPercent ?? 0))

  // Keep discount percentage exact on the displayed (delivery-included) original amount.
  if (price > 0 && discountType === "PERCENTAGE" && discountPercent > 0) {
    const standardIncluded = getStandardIncludedDeliveryCharge()
    const originalDisplayPrice = roundCurrency(price + standardIncluded)
    const discountedDisplayPrice = roundCurrency(
      originalDisplayPrice - (originalDisplayPrice * discountPercent) / 100
    )
    return Math.max(0, roundCurrency(discountedDisplayPrice - standardIncluded))
  }

  return finalPrice > 0 ? finalPrice : price
}

export function calculatePercentageDiscount(originalPrice: number, discountPercent: number) {
  const normalizedOriginalPrice = Math.max(0, Number(originalPrice || 0))
  const normalizedPercent = normalizePercent(Number(discountPercent || 0))
  const discountAmount = roundCurrency((normalizedOriginalPrice * normalizedPercent) / 100)
  const finalPrice = roundCurrency(normalizedOriginalPrice - discountAmount)

  return {
    originalPrice: roundCurrency(normalizedOriginalPrice),
    discountPercent: normalizedPercent,
    discountAmount,
    finalPrice,
  }
}

export function getBackendDiscountedBasePrice(item: PricedItem): number {
  // Reuse unified catalog logic so backend and frontend stay identical.
  return getCatalogBasePrice(item)
}

export function getCatalogEffectivePrice(item: PricedItem): number {
  return getCatalogBasePrice(item) + getStandardIncludedDeliveryCharge()
}

export function getCatalogOriginalEffectivePrice(item: PricedItem): number | null {
  const base = getCatalogBasePrice(item)
  const original = Math.max(0, Number(item.price ?? 0))
  if (!Number.isFinite(original) || original <= base) return null
  return original + getStandardIncludedDeliveryCharge()
}

export function getCatalogDiscountAmount(item: PricedItem): number {
  const original = getCatalogOriginalEffectivePrice(item)
  if (original === null) return 0
  const effective = getCatalogEffectivePrice(item)
  return Math.max(0, original - effective)
}

export function getCatalogDiscountPercent(item: PricedItem): number {
  const original = getCatalogOriginalEffectivePrice(item)
  if (original === null || original <= 0) return 0
  const effective = getCatalogEffectivePrice(item)
  return Math.max(0, Math.round(((original - effective) / original) * 100))
}

export function getExpressExtraCharge(includedStandardDeliveryCharge: number, expressDeliveryCharge: number): number {
  const included = Math.max(0, Math.round(includedStandardDeliveryCharge))
  const express = Math.max(0, Math.round(expressDeliveryCharge))
  return Math.max(express - included, 0)
}

export function getCodHandlingCharge(standardDeliveryCharge: number, codDeliveryCharge: number): number {
  const standard = Math.max(0, Math.round(standardDeliveryCharge))
  const cod = Math.max(0, Math.round(codDeliveryCharge))
  return Math.max(cod - standard, 0)
}

/**
 * Calculate handling charge for Standard delivery based on Shiprocket rate
 * If Shiprocket charge is higher than included standard charge (default ₹499), charge the difference
 * Otherwise, show as FREE
 * 
 * @param shiprocketStandardRate - Rate from Shiprocket for standard/surface delivery
 * @returns Handling charge (0 if free, or amount above ₹180)
 * 
 * @example
 * getHandlingChargeForStandard(450) => 0 (FREE - less than ₹499)
 * getHandlingChargeForStandard(650) => 151 (650 - 499)
 */
export function getHandlingChargeForStandard(shiprocketStandardRate: number): number {
  const base = getStandardIncludedDeliveryCharge()
  const shiprocket = Math.max(0, Math.round(shiprocketStandardRate))
  return Math.max(shiprocket - base, 0)
}

/**
 * Calculate express delivery surcharge after subtracting included standard base (default ₹499)
 * If Express charge > included base: charge the difference
 * If Express charge <= included base: show as FREE
 * 
 * @param shiprocketExpressRate - Rate from Shiprocket for express/air delivery
 * @returns Express surcharge (0 if free, or amount above ₹180)
 * 
 * @example
 * getExpressChargeAfterStandard(450) => 0 (FREE - less than ₹499)
 * getExpressChargeAfterStandard(650) => 151 (650 - 499)
 */
export function getExpressChargeAfterStandard(shiprocketExpressRate: number): number {
  const base = getStandardIncludedDeliveryCharge()
  const shiprocket = Math.max(0, Math.round(shiprocketExpressRate))
  return Math.max(shiprocket - base, 0)
}

/**
 * Split a handling amount into Packaging (60%) and Handling (40%).
 * The sum of both parts always equals the original rounded handling amount.
 */
export function splitHandlingCharge(handlingAmount: number): {
  packagingCharge: number
  handlingFee: number
} {
  const total = Math.max(0, Math.round(handlingAmount))
  const packagingCharge = Math.round(total * 0.6)
  const handlingFee = Math.max(total - packagingCharge, 0)

  return {
    packagingCharge,
    handlingFee,
  }
}
