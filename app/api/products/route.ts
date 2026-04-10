import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { validateProductWeight } from "@/lib/config"

function singularizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 3) return `${token.slice(0, -3)}y`
  if (token.endsWith("sses") || token.endsWith("shes") || token.endsWith("ches") || token.endsWith("xes") || token.endsWith("zes")) {
    return token.slice(0, -2)
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 1) return token.slice(0, -1)
  return token
}

function normalizeCategoryTerm(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeToken)
    .join(" ")
}

function buildCategoryVariants(term: string): string[] {
  const normalized = normalizeCategoryTerm(term)
  if (!normalized) return []

  const variants = new Set<string>()
  variants.add(term.trim())
  variants.add(normalized)

  const singularWords = normalized.split(" ").filter(Boolean)
  const pluralWords = singularWords.map(word => word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`)

  variants.add(singularWords.join(" "))
  variants.add(pluralWords.join(" "))

  return Array.from(variants).filter(Boolean)
}

// Helper function to calculate virtual fields (Tag & Final Price)
const enrichProduct = (product: any) => {
  const now = new Date();
  const createdAt = new Date(product.createdAt);
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calculate Tag
  let tag = null;
  const monthsSinceCreation = Math.max(daysSinceCreation / 30, 1);
  const avgMonthlySales = (product.totalSold || 0) / monthsSinceCreation;

  if (daysSinceCreation <= 14) tag = "NEW";
  else if (product.isBestSeller || (product.totalSold || 0) > 500) tag = "BEST_SELLER";
  else if (avgMonthlySales > 50) tag = "TRENDING";

  // Calculate Final Price
  let finalPrice = product.price;
  if (product.discountType === "PERCENTAGE") {
    finalPrice = Math.round(product.price - (product.price * (product.discountPercent || 0)) / 100);
  } else if (product.discountType === "FIXED") {
    finalPrice = Math.max(0, product.price - (product.discountPercent || 0));
  }

  return { ...product, tag, finalPrice };
};

function applyClientStyleFilters(products: any[], searchParams: URLSearchParams) {
  const tag = searchParams.get("tag")?.trim() || ""
  const inStock = searchParams.get("inStock") === "1"
  const hasDiscount = searchParams.get("discount") === "1"
  const priceMin = Number(searchParams.get("priceMin") ?? 0)
  const priceMaxParam = searchParams.get("priceMax")
  const priceMax = priceMaxParam === null ? Number.POSITIVE_INFINITY : Number(priceMaxParam)
  const rating = Number(searchParams.get("rating") ?? 0)

  let result = [...products]

  if (tag) {
    result = result.filter(product => product.tag === tag)
  }

  if (inStock) {
    result = result.filter(product => (product.stock ?? 0) > 0)
  }

  if (hasDiscount) {
    result = result.filter(product => (product.finalPrice ?? product.price) < product.price)
  }

  if (priceMin > 0 || Number.isFinite(priceMax)) {
    result = result.filter(product => {
      const finalPrice = product.finalPrice ?? product.price
      return finalPrice >= priceMin && finalPrice <= priceMax
    })
  }

  if (rating > 0) {
    result = result.filter(product => (product.rating ?? 0) >= rating)
  }

  const sort = searchParams.get("sort") ?? ""
  switch (sort) {
    case "price_asc":
      result.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price))
      break
    case "price_desc":
      result.sort((a, b) => (b.finalPrice ?? b.price) - (a.finalPrice ?? a.price))
      break
    case "rating":
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      break
    case "newest":
      result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      break
    case "popularity":
      result.sort((a, b) => {
        const weight = (product: any) => product.tag === "BEST_SELLER" ? 3 : product.tag === "TRENDING" ? 2 : product.tag === "NEW" ? 1 : 0
        return weight(b) - weight(a)
      })
      break
  }

  return result
}

// ✅ GET: Public – list active products
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")?.trim() || searchParams.get("query")?.trim() || ""
    const category = searchParams.get("category")?.trim() || ""
    const categoryTerms = category
      .split(",")
      .map(term => term.trim())
      .filter(Boolean)
    const categoryVariants = Array.from(new Set(categoryTerms.flatMap(buildCategoryVariants)))
    const limit = Number(searchParams.get("limit") ?? 0)
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean)

    const where: any = { isActive: true }
    const andClauses: any[] = []

    if (categoryVariants.length > 0) {
      andClauses.push({
        OR: categoryVariants.map(term => ({
          category: { contains: term, mode: "insensitive" },
        })),
      })
    }

    if (queryTokens.length > 0) {
      andClauses.push(...queryTokens.map(token => ({
        OR: [
          { title: { contains: token, mode: "insensitive" } },
          { description: { contains: token, mode: "insensitive" } },
          { category: { contains: token, mode: "insensitive" } },
          { model: { contains: token, mode: "insensitive" } },
        ],
      })))
    }

    if (andClauses.length > 0) {
      where.AND = andClauses
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const enrichedProducts = products.map(enrichProduct);
    const filteredProducts = applyClientStyleFilters(enrichedProducts, searchParams)
    const limitedProducts = Number.isFinite(limit) && limit > 0 ? filteredProducts.slice(0, limit) : filteredProducts

    return NextResponse.json(limitedProducts, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch products" }, { status: 500 });
  }
}

// ✅ POST: Admin only – create product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // 1. Extract values and parse them
    const price = parseFloat(body.price);
    const weight = parseFloat(body.weight);
    const discountPercent = parseFloat(body.discountPercent || 0);
    const discountType = body.discountType || null;
const model = body.model || null; // ✅ NEW
    validateProductWeight(weight);
    // 2. Calculate finalPrice BEFORE creating in DB
    let calculatedFinalPrice = price;
    if (discountType === "PERCENTAGE") {
      calculatedFinalPrice = Math.round(price - (price * discountPercent) / 100);
    } else if (discountType === "FIXED") {
      calculatedFinalPrice = Math.max(0, price - discountPercent);
    }

    // 3. Create using the full schema fields
    const product = await prisma.product.create({
      data: {
        title: body.title,
        description: body.description,
        price: price,
        model: model,
        // Ensure originalPrice defaults to price as per your schema note
        originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : price, 
        finalPrice: calculatedFinalPrice, // Now mandatory per your schema
        discountType: discountType,
        discountPercent: discountPercent,
        weight: weight,
        stock: parseInt(body.stock || 0),
        images: body.images || [],
        category: body.category || "Uncategorized",
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        isBestSeller: body.isBestSeller ?? false,
        vendorId: session.user.id,
      },
    });

    return NextResponse.json(enrichProduct(product), { status: 201 });
  } catch (error) {
    console.error("Prisma Create Error:", error);
    return NextResponse.json({ message: "Failed to create product" }, { status: 500 });
  }
}