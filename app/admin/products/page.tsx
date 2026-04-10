import Link from "next/link"

async function getProducts() {
	const res = await fetch("http://localhost:3000/api/products", { cache: "no-store" })
	return res.json()
}

export default async function AdminProducts() {
	const products = await getProducts()

	return (
		<div className="p-6">
			<h2 className="text-2xl font-semibold mb-4">Products</h2>
			<div className="space-y-3">
				{products.map((p: { id: string | number; title: string; weight?: number }) => (
					<div key={p.id} className="flex items-center justify-between rounded border p-3">
						<div>
							<div className="font-medium">{p.title}</div>
							<div className="text-sm text-gray-500">
								Weight: {typeof p.weight === "number" && p.weight > 0 ? `${p.weight} kg` : "missing"}
							</div>
						</div>
						<Link
							href={`/admin/products/${p.id}`}
							className="rounded bg-black px-3 py-2 text-sm text-white"
						>
							Edit weight
						</Link>
					</div>
				))}
			</div>
		</div>
	)
}