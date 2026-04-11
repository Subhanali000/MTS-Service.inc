import { prisma } from "@/lib/prisma";

/**
 * Default shipping rules for MTS Services.inc
 */

export type PickupLocation = {
  businessName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string | null;
  email?: string | null;
};

type PickupLocationRow = {
  businessName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string | null;
  email: string | null;
};

export async function getPickupLocation(): Promise<PickupLocation> {
  const activeRows = (await prisma.$queryRawUnsafe(`
    SELECT
      "businessName",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "pincode",
      "country",
      "phone",
      "email"
    FROM "pickup_points"
    WHERE "code" = 'MTS_MAIN_PICKUP' OR "isActive" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
  `)) as PickupLocationRow[]

  const fallbackRows = activeRows.length > 0
    ? activeRows
    : (await prisma.$queryRawUnsafe(`
        SELECT
          "businessName",
          "addressLine1",
          "addressLine2",
          "city",
          "state",
          "pincode",
          "country",
          "phone",
          "email"
        FROM "pickup_points"
        ORDER BY "createdAt" ASC
        LIMIT 1
      `)) as PickupLocationRow[]

  const pickupPoint = fallbackRows[0]

  if (!pickupPoint) {
    throw new Error("Pickup point is not configured in the database");
  }

  return {
    businessName: pickupPoint.businessName,
    addressLine1: pickupPoint.addressLine1,
    addressLine2: pickupPoint.addressLine2,
    city: pickupPoint.city,
    state: pickupPoint.state,
    pincode: pickupPoint.pincode,
    country: pickupPoint.country,
    phone: pickupPoint.phone,
    email: pickupPoint.email,
  };
}

/**
 * Validate that a product has a valid weight
 * Weight is MANDATORY - no fallback allowed
 */
export function validateProductWeight(weight: any): asserts weight is number {
  if (typeof weight !== "number" || weight <= 0) {
    throw new Error(
      `Invalid product weight: ${weight}. Weight must be a positive number (in kg).`
    );
  }
}

/**
 * Calculate total shipment weight from order items
 * Each item's weight is multiplied by its quantity
 * Weight is MANDATORY - no fallback to 0.5 kg
 */
export function calculateShipmentWeight(
  items: Array<{ product: { weight: number }; quantity: number }>
): number {
  if (!items || items.length === 0) {
    throw new Error("Cannot calculate shipment weight: no items in order");
  }

  let totalWeight = 0;

  for (const item of items) {
    const itemWeight = item.product?.weight;
    const quantity = item.quantity || 1;

    if (typeof itemWeight !== "number" || itemWeight <= 0) {
      throw new Error(
        `Invalid weight for product in order. Weight: ${itemWeight}, must be a positive number.`
      );
    }

    totalWeight += itemWeight * quantity;
  }

  // Ensure minimum 0.5 kg for Shiprocket (API requirement), but this is just for API, not product
  return Math.max(totalWeight, 0.5);
}

