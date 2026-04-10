export async function getProducts(
  query?: string,
  options?: {
    category?: string
    limit?: number
    filters?: Record<string, string | number | boolean | null | undefined>
  }
) {
  try {
    const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/products`;
    const params = new URLSearchParams();

    if (query?.trim()) {
      params.set("q", query.trim());
    }

    if (options?.category?.trim()) {
      params.set("category", options.category.trim());
    }

    if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
      params.set("limit", String(options.limit));
    }

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined || value === null) continue;

        const serialized = String(value).trim();
        if (!serialized) continue;

        params.set(key, serialized);
      }
    }

    const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch products, status:", res.status);
      return [];
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}
