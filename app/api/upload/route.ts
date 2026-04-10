import { v2 as cloudinary } from "cloudinary"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Upload a single buffer to Cloudinary ─────────────────────────────────────

function uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          // Auto-compress and cap dimensions so review photos don't bloat storage
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("No result from Cloudinary"))
          else resolve(result.secure_url)
        }
      )
      .end(buffer)
  })
}

// ── POST /api/upload ──────────────────────────────────────────────────────────
// Accepts:
//   • "photos" (multiple)  — review photo uploads from WriteReviewModal
//   • "file"   (single)    — legacy single-file upload
//
// Returns: { urls: string[] }

export async function POST(req: Request) {
  try {
    // Must be logged in to upload
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const formData = await req.formData()

    // Collect all files — supports both "photos" (multi) and "file" (legacy single)
    const files: File[] = []

    const photoEntries = formData.getAll("photos")
    for (const entry of photoEntries) {
      if (entry instanceof File && entry.size > 0) files.push(entry)
    }

    // Legacy single-file fallback
    if (files.length === 0) {
      const single = formData.get("file")
      if (single instanceof File && single.size > 0) files.push(single)
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    // Cap at 5 files per request
    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 photos per upload" }, { status: 400 })
    }

    // Validate each file is an image and under 10 MB
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `"${file.name}" is not an image` },
          { status: 400 }
        )
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `"${file.name}" exceeds the 10 MB limit` },
          { status: 400 }
        )
      }
    }

    // Upload all files in parallel
    const urls = await Promise.all(
      files.map(async (file) => {
        const bytes  = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        return uploadBuffer(buffer, "ecommerce/reviews")
      })
    )

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("[POST /api/upload] error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}