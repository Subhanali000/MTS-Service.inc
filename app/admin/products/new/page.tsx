"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewProductPage() {
  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [weight, setWeight] = useState("")
  const [description, setDescription] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: parseFloat(price),
          weight: parseFloat(weight),
          description
        })
      })
      if (!res.ok) throw new Error("Failed to create product")
      router.push("/admin/products")
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 border rounded mt-8">
      <h2 className="text-xl font-bold mb-4">New Product</h2>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />

      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />

      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Weight in kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
        required
      />

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Create Product
      </button>
    </form>
  )
}
