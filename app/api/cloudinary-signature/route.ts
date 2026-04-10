import { NextResponse } from "next/server";
import crypto from "crypto";

function createSignaturePayload() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `folder=orders&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  return {
    timestamp,
    signature,
    cloudName,
    apiKey,
  };
}

function signatureResponse() {
  try {
    const payload = createSignaturePayload();
    if (!payload) {
      return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=25, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Signature error" }, { status: 500 });
  }
}

export async function GET() {
  return signatureResponse();
}

export async function POST() {
  return signatureResponse();
}