"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function EditProductWeightPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const productId = params?.id

  const [title, setTitle] = useState("")
  const [weight, setWeight] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!productId) return

    const loadProduct = async () => {
      setLoading(true)
      setError("")

      try {
        const res = await fetch(`/api/products/${productId}`, { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Failed to load product (${res.status})`)
        }

        const product = await res.json()
        setTitle(product.title ?? "")
        setWeight(typeof product.weight === "number" ? String(product.weight) : "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product")
      } finally {
        setLoading(false)
      }
    }

    void loadProduct()
  }, [productId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productId) return

    setSaving(true)
    setError("")

    try {
      const parsedWeight = Number(weight)
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: parsedWeight }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update product (${res.status})`)
      }

      router.push("/admin/products")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading product...</div>
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-semibold">Edit product weight</h1>
      <p className="mb-6 text-sm text-gray-500">Update the shipping weight for {title || "this product"}.</p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Weight in kg</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Example: 1.25"
          />
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save weight"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
