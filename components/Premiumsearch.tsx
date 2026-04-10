"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Search, TrendingUp, Clock, Star, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { buildProductBloom, normalizeSearchTokens } from "@/lib/bloom";
import { getCatalogEffectivePrice, getCatalogOriginalEffectivePrice } from "@/lib/pricing";

// ─── Types — mirrors your Mongoose model + toObject({ virtuals: true }) ────────
export interface Product {
  id: string;   
  model?:string                                 // MongoDB ObjectId as string
  title: string;          // primary field (name is a DB alias)
  name?: string;           // fallback alias — mapProduct sets title from name
  category: string;
  price: number;                                  // base price field on your model
  finalPrice?: number;                            // virtual: price after discount
  originalPrice?: number;
  discount?: number;                              // discount % stored on model
  rating: number;
  reviewCount?: number;
  numReviews?: number;                            // some schemas use numReviews
  images?: string[];                              // array of image URLs
  image?: string;                                 // fallback single image
  tag?: "BEST_SELLER" | "TRENDING" | "NEW";       // virtual computed by backend
  inStock: boolean;
  stock?: number;                                 // raw stock field
  description?: string;
}

interface PremiumSearchProps {
  onSearch?: (query: string) => void;
  onProductClick?: (product: Product) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TRENDING_SEARCHES = [
  "HP Refurbished Laptop",
  "Dell i7 Laptop",
  "Lenovo ThinkPad",
  "MacBook Air M1",
  "Gaming PC Setup",
  "Used Office Laptop",
  "Laptop Under 25000",
  "SSD Upgrade",
  "8GB RAM Laptop",
  "Student Laptop"
];

const CATEGORIES = [
  "Refurbished Laptops",
  "New Laptops",
  "Gaming PCs",
  "Office PCs",
  "Computer Accessories",
  "Monitors",
  "Keyboards & Mouse",
  "Hard Drives & SSD",
  "WiFi & Routers",
  "PC Components"
];

const TAG_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  BEST_SELLER: { label: "Best Seller", bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  TRENDING:    { label: "Trending",    bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500"    },
  NEW:         { label: "New",         bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

// ─── Normalise helpers (handle both field naming conventions) ─────────────────
/** Returns the display price — uses finalPrice virtual if available */
// ─── Normalise helpers ────────────────────────────────────────────────────────

/** Returns the price the user actually pays */
function displayPrice(p: Product): number {
  return getCatalogEffectivePrice(p);
}

/** Returns the "strikethrough" price if a discount exists */
function originalPrice(p: Product): number | null {
  return getCatalogOriginalEffectivePrice(p);
}

function discountPct(p: Product): number {
  const current = displayPrice(p);
  const original = originalPrice(p);

  if (!original || original <= current) return 0;

  return Math.round(((original - current) / original) * 100);
}

/** First available image URL */
function productImage(p: Product): string {
  if (p.images?.length) return p.images[0];
  if (p.image) return p.image;
  return "/placeholder-product.png";
}

/** Review count — handles both field names */
function reviewCount(p: Product): number {
  return p.reviewCount ?? p.numReviews ?? 0;
}

/** Whether the product is in stock — handles both inStock bool and stock number */
function inStock(p: Product): boolean {
  if (typeof p.stock === "number") return p.stock > 0;
  return p.inStock;
}

// ─── Highlight matching text ──────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  const safeText = text ?? "";
  if (!query.trim()) return <span>{safeText}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(`(${escaped})`, "gi");
  const parts   = safeText.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-pink-100 text-pink-700 rounded-sm font-semibold not-italic px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
function LoadingDots({ label = "Searching…" }: { label?: string }) {
  return (
    <div className="p-6 flex items-center justify-center gap-3">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
            className="w-1.5 h-1.5 rounded-full bg-pink-400"
          />
        ))}
      </div>
      <span className="text-sm text-gray-400 font-medium">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PremiumSearch({ onSearch, onProductClick }: PremiumSearchProps) {
  const [query, setQuery]               = useState("");
  const [focused, setFocused]           = useState(false);
  const [allProducts, setAllProducts]   = useState<Product[]>([]);
  const [results, setResults]           = useState<Product[]>([]);
  const [highlighted, setHighlighted]   = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [isFetching, setIsFetching]     = useState(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const hasFetched                      = useRef(false);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load recent searches from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mts_recent") || "[]");
      setRecentSearches(Array.isArray(saved) ? saved.slice(0, 5) : []);
    } catch { /* ignore */ }
  }, []);

  const saveRecentSearch = (q: string | undefined) => {
    if (!q || !q.trim()) return;
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(s => s !== q)].slice(0, 5);
      try { localStorage.setItem("mts_recent", JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("mts_recent"); } catch { /* ignore */ }
  };

  // ── Fetch all products from /api/products on first focus ───────────────────
  // Uses the same GET handler pattern as your /api/products/[id]/route.ts
  // but hits the collection endpoint instead. Products are cached in state
  // so the fetch only happens once per page load.
  const fetchProducts = useCallback(async () => {
    if (hasFetched.current && allProducts.length > 0) return; // already loaded
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/products", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // No cache — mirrors your backend which does fresh DB reads
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Your API may return:  Product[]  OR  { products: Product[] }
      const list: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : [];

      setAllProducts(list);
      hasFetched.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFetchError(msg);
    } finally {
      setIsFetching(false);
    }
  }, [allProducts.length]);

  const bloomIndex = useMemo(
    () => new Map(allProducts.map(product => [product.id, buildProductBloom(product)])),
    [allProducts]
  )

  // Trigger fetch only when user opens the search panel
  const handleFocus = () => {
    setFocused(true);
    fetchProducts();
  };

  const retryFetch = () => {
    hasFetched.current = false;
    setAllProducts([]);
    fetchProducts();
  };

  // ── Client-side fuzzy search ───────────────────────────────────────────────
  const performSearch = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setIsSearching(true);
    // Small timeout gives the UI a chance to render the loading state
  const t = setTimeout(() => {
  const words = normalizeSearchTokens(q);
  const bloomSafeWords = words.filter(word => word.length >= 5);

  const filtered = allProducts
    .filter((p) => {
      const bloom = bloomIndex.get(p.id)
      if (bloom && bloomSafeWords.length > 0 && !bloomSafeWords.every(word => bloom.has(word))) {
        return false;
      }

      const text = `
        ${p.title ?? p.name ?? ""}
        ${p.category ?? ""}
        ${p.description ?? ""}
        ${p.tag ?? ""}
      `.toLowerCase();

      // Every word must match somewhere
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => {
      const aText = (a.title ?? a.name ?? "").toLowerCase();
      const bText = (b.title ?? b.name ?? "").toLowerCase();

      // Priority 1: title starts with first word
      const firstWord = words[0] || "";
      const aExact = aText.startsWith(firstWord) ? 0 : 1;
      const bExact = bText.startsWith(firstWord) ? 0 : 1;

      // Priority 2: higher rating
      return aExact - bExact || (b.rating ?? 0) - (a.rating ?? 0);
    })
    .slice(0, 6);

  setResults(filtered);
  setIsSearching(false);
}, 120);

return () => clearTimeout(t);
  }, [allProducts, bloomIndex]);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // ── Click outside closes dropdown ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        setHighlighted(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focused) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, -1));
    }
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter") {
      if (highlighted >= 0 && results[highlighted]) {
        handleProductClick(results[highlighted]);
      } else if (query.trim()) {
        handleSearchSubmit(query);
      }
    }
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleProductClick = (product: Product) => {
    if (product?.title || product?.name) saveRecentSearch(product.title ?? product.name ?? "");
    onProductClick?.(product);
    setFocused(false);
    setQuery("");
  };

  const handleSearchSubmit = (q: string) => {
    if (!q.trim()) return;
    saveRecentSearch(q);
    onSearch?.(q);
    setFocused(false);
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    performSearch(term);
    inputRef.current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-998"
            onClick={() => setFocused(false)}
          />
        )}
      </AnimatePresence>

      {/* Wrapper */}
      <div ref={containerRef} className="relative z-999" style={{ width: 340 }}>

        {/* ── Input bar ── */}
        <motion.div
          animate={{ width: focused ? 390 : 340 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative flex items-center"
        >
          <motion.div
            animate={{ color: focused ? "#ec4899" : "#9ca3af" }}
            className="absolute left-3.5 z-10 pointer-events-none"
          >
            <Search size={16} />
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlighted(-1); }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands…"
            className="w-full h-10 pl-10 pr-9 text-sm rounded-xl border transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium"
            style={{
              background:  focused ? "#ffffff" : "#f9f9fb",
              borderColor: focused ? "#ec4899" : "#e5e7eb",
              boxShadow:   focused
                ? "0 0 0 3px rgba(236,72,153,0.12), 0 4px 20px rgba(0,0,0,0.08)"
                : "none",
            }}
          />

          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                className="absolute right-3 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
          <button
    onClick={() => handleSearchSubmit(query)}
    className="absolute right-1.5 h-8 px-3 cursor-pointer rounded-lg text-xs font-bold text-white flex items-center gap-1"
    style={{
     background: "linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)"
    }}
  >
    <Search size={13} />
    Search
  </button>
        </motion.div>

        {/* ── Dropdown panel ── */}
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute top-[calc(100%+10px)] left-0 rounded-2xl overflow-hidden z-1000"
              style={{
                background:  "#ffffff",
                boxShadow:   "0 8px 40px rgba(0,0,0,0.14), 0 2px 12px rgba(236,72,153,0.08)",
                border:      "1px solid rgba(236,72,153,0.12)",
                minWidth:    390,
              }}
            >

              {/* ── Error state ── */}
              {fetchError && (
                <div className="p-5 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-600">Could not load products</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{fetchError}</p>
                    <button
                      onClick={retryFetch}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-800 transition-colors"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  </div>
                </div>
              )}

              {/* ── Products loading ── */}
              {!fetchError && isFetching && (
                <LoadingDots label="Loading products…" />
              )}

              {/* ── Empty query: trending / recents / categories ── */}
              {!fetchError && !isFetching && !query.trim() && (
                <div className="p-4">

                  {/* Trending */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={13} className="text-pink-500" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Trending Now
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map(term => (
                        <button
                          key={term}
                          onClick={() => handleTrendingClick(term)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:border-pink-400 hover:bg-pink-50 hover:text-pink-600 text-gray-600 border-gray-200 bg-gray-50"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Recent
                          </span>
                        </div>
                        <button
                          onClick={clearRecent}
                          className="text-[11px] text-pink-500 hover:text-pink-700 font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.map(s => (
                          <button
                            key={s}
                            onClick={() => handleTrendingClick(s)}
                            className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
                          >
                            <Clock size={13} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-600 group-hover:text-gray-800 font-medium">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Browse categories */}
                  <div className={recentSearches.length > 0 ? "border-t border-gray-100 pt-4" : ""}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={13} className="text-amber-500" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        Browse Categories
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleTrendingClick(cat)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-pink-50 hover:text-pink-600 border border-transparent hover:border-pink-200 transition-all text-center"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Has query: search results ── */}
              {!fetchError && !isFetching && query.trim() && (
                <div>
                  {isSearching ? (
                    <LoadingDots />
                  ) : results.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        No results for &quot;{query}&quot;
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Try a different keyword</p>
                    </div>
                  ) : (
                    <>
                      {/* Results header */}
                      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-50">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                          {results.length} Product{results.length !== 1 ? "s" : ""} Found
                        </span>
                        <button
                          onClick={() => handleSearchSubmit(query)}
                          className="text-[11px] text-pink-500 hover:text-pink-700 font-bold transition-colors"
                        >
                          View All →
                        </button>
                      </div>

                      {/* Product rows */}
                      <div className="py-2">
                        {results.map((product, idx) => {
                          const isHL   = highlighted === idx;
                          const disc   = discountPct(product);
                          const orig   = originalPrice(product);
                          const tagCfg = product.tag ? TAG_CONFIG[product.tag] : null;
                          const img    = productImage(product);
                          const rc     = reviewCount(product);
                          const stock  = inStock(product);

                          return (
                            <motion.button
                              key={product.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              onClick={() => handleProductClick(product)}
                              onMouseEnter={() => setHighlighted(idx)}
                              className={`w-full text-left px-4 py-3 flex items-center gap-3.5 transition-all ${
                                isHL ? "bg-pink-50/70" : "hover:bg-gray-50/80"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                <Image
                                  src={img}
                                  alt={product.title ?? product.name ?? "Product image"}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  onError={e => {
                                    (e.target as HTMLImageElement).src = "/placeholder-product.png";
                                  }}
                                />
                                {!stock && (
                                  <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                                    <span className="text-[8px] font-black text-gray-500 text-center leading-tight">
                                      OUT OF<br />STOCK
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                {/* Name + discount badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                                    <HighlightText text={product.title ?? product.name ?? ""} query={query} />
                                  </p>
                                  {disc > 0 && (
                                    <span className="shrink-0 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                      -{disc}%
                                    </span>
                                  )}
                                </div>

                                {/* Category + tag */}
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-gray-400 font-medium">
                                    <HighlightText text={product.category} query={query} />
                                  </span>
                                  {tagCfg && (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tagCfg.bg} ${tagCfg.text}`}
                                    >
                                      <span className={`w-1 h-1 rounded-full ${tagCfg.dot}`} />
                                      {tagCfg.label}
                                    </span>
                                  )}
                                </div>

                                {/* Price + rating */}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-black text-gray-900">
                                    ₹{displayPrice(product).toLocaleString("en-IN")}
                                  </span>
                                  {orig && (
                                    <span className="text-xs text-gray-400 line-through">
                                      ₹{orig.toLocaleString("en-IN")}
                                    </span>
                                  )}
                                  {product.rating > 0 && (
                                    <div className="flex items-center gap-0.5 ml-auto">
                                      <Star size={10} className="text-amber-400 fill-amber-400" />
                                      <span className="text-[11px] font-semibold text-gray-600">
                                        {product.rating.toFixed(1)}
                                      </span>
                                      {rc > 0 && (
                                        <span className="text-[10px] text-gray-400">
                                          ({rc > 999 ? `${(rc / 1000).toFixed(1)}k` : rc})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Footer CTA */}
                      <div className="px-4 py-3 border-t border-gray-100">
                        <button
                          onClick={() => handleSearchSubmit(query)}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
                          style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
                        >
                          See all results for &quot;{query}&quot;
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}