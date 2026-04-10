"use client";

import Image from "next/image";
import Link from "next/link";
import { useShop, Product } from "@/app/context/ShopContext";
import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import { type CourierOption, parseEtd, formatDateRange } from "@/lib/shiprocket";
import { getCatalogEffectivePrice, getCatalogOriginalEffectivePrice, getCatalogDiscountPercent, getCodHandlingCharge, getExpressExtraCharge, getStandardIncludedDeliveryCharge, getHandlingChargeForStandard, getExpressChargeAfterStandard, splitHandlingCharge } from "@/lib/pricing";
import {
  ShoppingBag, Trash2, Plus, Minus, MapPin, Tag, ChevronRight,
  Shield, RotateCcw, Gift, Edit2, Check, X, Star,
  ChevronDown, ChevronUp, Zap, Package, Clock, Home, Briefcase,
  AlertCircle, Loader2, Truck
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItemFull = { product: Product; quantity: number };

type Address = {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type CouponResult = {
  valid: boolean;
  code: string;
  type: "pct" | "flat";
  value: number;
  label: string;
  discount: number;
};

type AvailableCoupon = {
  code: string;
  type: "pct" | "flat";
  value: number;
  label: string;
  minOrder: number;
};

type DeliveryTier = {
  label: "standard" | "express";
  courier: CourierOption;
};

type TopRate = {
  courier: string;
  rate: number;
  etd?: string | null;
};



// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeliveryLabel(courier: CourierOption): string {
  const etd = parseEtd(courier.estimated_delivery);
  if (etd) return formatDateRange(etd.from, etd.to);
  return courier.etd ?? "";
}

function toPositiveNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

function getLowestRate(rates: TopRate[] | null | undefined): number | null {
  if (!Array.isArray(rates) || rates.length === 0) return null;
  const normalized = rates.map(rate => toPositiveNumber(rate.rate)).filter(rate => rate > 0);
  if (normalized.length === 0) return null;
  return Math.min(...normalized);
}

function getProductWeightKg(product: Product): number {
  const weight = toPositiveNumber((product as any)?.weight);
  if (weight <= 0) {
    throw new Error(
      `Product "${product.title}" is missing a valid weight. Weight is mandatory for shipping calculations.`
    );
  }
  return weight;
}

// ─── Empty Cart ───────────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-linear-to-br from-pink-50 to-rose-100 flex items-center justify-center">
          <ShoppingBag size={52} className="text-pink-400" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold">0</div>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Your cart is empty</h2>
      <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
        Looks like you haven't added anything yet. Explore our collection and find something you'll love.
      </p>
      <Link href="/products"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-pink-600 transition-all duration-300 shadow-lg"
      >
        Start Shopping <ChevronRight size={18} />
      </Link>
    </div>
  );
}

// ─── Address Form ─────────────────────────────────────────────────────────────

function AddressForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Address>;
  onSave: (a: Omit<Address, "_id"> & { _id?: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    type: "home" as Address["type"],
    name: "", phone: "", line1: "", line2: "",
    city: "", state: "", pincode: "", isDefault: false,
    ...initial,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));
  const input = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 bg-white transition-all placeholder:text-gray-400";

  const handleSubmit = () => {
    const missing: string[] = [];
    if (!form.name)    missing.push("Full Name");
    if (!form.phone)   missing.push("Phone");
    if (!form.line1)   missing.push("Address Line 1");
    if (!form.city)    missing.push("City");
    if (!form.state)   missing.push("State");
    if (!form.pincode) missing.push("Pincode");
    if (missing.length) { setErrors(missing); return; }
    setErrors([]);
    onSave({ ...form, id: initial?.id ?? "" });
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
      <div className="flex gap-2">
        {(["home", "work", "other"] as const).map(t => (
          <button key={t} type="button" onClick={() => set("type", t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              form.type === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {t === "home" ? <Home size={12}/> : t === "work" ? <Briefcase size={12}/> : <MapPin size={12}/>}
            {t}
          </button>
        ))}
      </div>
      {errors.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={13}/> Please fill: {errors.join(", ")}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Full Name *"    value={form.name}     onChange={e => set("name",  e.target.value)} className={input} />
       <input
  placeholder="Phone Number *"
  value={form.phone}
  maxLength={10}
  inputMode="numeric"
  pattern="[6-9]{1}[0-9]{9}"
  onChange={(e) => {
    let value = e.target.value.replace(/\D/g, "") // remove non-digits

    // enforce starting digit 6–9
    if (value.length === 1 && !/[6-9]/.test(value)) return

    if (value.length <= 10) {
      set("phone", value)
    }
  }}
  className={input}
/>
      </div>
      <input placeholder="Address Line 1 *"          value={form.line1}       onChange={e => set("line1",   e.target.value)} className={input} />
      <input placeholder="Address Line 2 (optional)" value={form.line2 ?? ""} onChange={e => set("line2",   e.target.value)} className={input} />
      <div className="grid grid-cols-3 gap-3">
        <input placeholder="City *"    value={form.city}    onChange={e => set("city",    e.target.value)} className={input} />
        <input placeholder="State *"   value={form.state}   onChange={e => set("state",   e.target.value)} className={input} />
        <input placeholder="Pincode *" value={form.pincode} onChange={e => set("pincode", e.target.value)} className={input} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <div onClick={() => set("isDefault", !form.isDefault)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.isDefault ? "bg-pink-600 border-pink-600" : "border-gray-300"}`}>
          {form.isDefault && <Check size={10} className="text-white" strokeWidth={3}/>}
        </div>
        <span className="text-sm text-gray-600">Set as default address</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
          {saving && <Loader2 size={14} className="animate-spin"/>}
          {saving ? "Saving..." : "Save Address"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Cart Page ───────────────────────────────────────────────────────────

export default function CartPage() {
  const { cart, toggleCart, fetchCart } = useShop();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
const [popupMessage, setPopupMessage] = useState("");
const [showPopup, setShowPopup] = useState(false);
  // ── Delivery tiers fetched once per pincode ──
  const [tiers, setTiers] = useState<DeliveryTier[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<"unavailable" | "error" | null>(null);
  const [selectedTier, setSelectedTier] = useState<"standard" | "express">("standard");
  const [fetchedDeliveryKey, setFetchedDeliveryKey] = useState<string>("");
  const [lowestStandardRate, setLowestStandardRate] = useState<number | null>(null);
  const [lowestExpressRate, setLowestExpressRate] = useState<number | null>(null);
  const [lowestCodRate, setLowestCodRate] = useState<number | null>(null);
  const [showMoreDelivery, setShowMoreDelivery] = useState(false);
  const allCouriersFlatRef = useRef<CourierOption[]>([]);
const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE")
  // ── Address state ──
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState("");
  const [selectedAddr, setSelectedAddr] = useState<string>("");
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [addrExpanded, setAddrExpanded] = useState(true);

  // ── Coupon state ──
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // ── Gift state ──
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  // ── Selected items ──
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // ── Fetch cart ──
  useEffect(() => { fetchCart().finally(() => setLoading(false)); }, []);
 useEffect(() => {
  const ids = cart
    .map(i => i.product?.id)
    .filter(Boolean) as string[];

  setSelectedItems(ids);
}, [cart]);

  // ── Fetch addresses ──
  const fetchAddresses = useCallback(async () => {
    setAddrLoading(true);
    setAddrError("");
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) throw new Error();
      const data: Address[] = await res.json();
      setAddresses(data);
      const def = data.find(a => a.isDefault) ?? data[0];
      if (def) setSelectedAddr(def.id);
    } catch {
      setAddrError("Could not load addresses. Please refresh.");
    } finally {
      setAddrLoading(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons/validate");
      if (res.ok) setAvailableCoupons(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchAddresses(); fetchCoupons(); }, [fetchAddresses, fetchCoupons]);

  // ── Selected address ──
  const selectedAddress = addresses.find(a => a.id === selectedAddr);

  // ── Fetch delivery tiers when pincode changes ──
  useEffect(() => {
    const pin = selectedAddress?.pincode;
    if (!pin || !/^\d{6}$/.test(pin)) return;
    const deliveryMode = paymentMethod === "COD" ? "cod" : "prepaid";
    const selectedWeight = Math.max(
      0.5,
      cart.reduce((sum, item) => {
        const productId = item?.product?.id;
        if (!productId || !selectedItems.includes(productId)) return sum;
        const quantity = Math.max(1, Number(item.quantity || 1));
        return sum + getProductWeightKg(item.product) * quantity;
      }, 0)
    );
    const deliveryKey = `${pin}:${deliveryMode}:${selectedWeight.toFixed(3)}`;
    if (deliveryKey === fetchedDeliveryKey && tiers.length > 0) return;

    const controller = new AbortController();

    (async () => {
      setDeliveryLoading(true);
      setDeliveryError(null);
      setTiers([]);
      setLowestStandardRate(null);
      setLowestExpressRate(null);
      setLowestCodRate(null);

      try {
        const isCod = paymentMethod === "COD";
        const res = await fetch(
          `/api/delivery/serviceability?pincode=${pin}&cod=${isCod}&weight=${encodeURIComponent(selectedWeight.toFixed(3))}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (!data.available) {
          setDeliveryError("unavailable");
          setFetchedDeliveryKey(deliveryKey);
          return;
        }

        const flat: CourierOption[] = data.available_courier_companies
          ?? [...(data.express ?? []), ...(data.standard ?? [])];

        const standardTopRates = (data.standardTopRates ?? []) as TopRate[];
        const expressTopRates = (data.expressTopRates ?? []) as TopRate[];
        const codTopRates = (isCod ? standardTopRates : (data.codPreview?.topRates ?? [])) as TopRate[];

        setLowestStandardRate(getLowestRate(standardTopRates));
        setLowestExpressRate(getLowestRate(expressTopRates));
        setLowestCodRate(getLowestRate(codTopRates));

        allCouriersFlatRef.current = flat;
        if (!flat.length) {
          setDeliveryError("unavailable");
          setFetchedDeliveryKey(deliveryKey);
          return;
        }

        const stdCourier = flat.reduce((a: CourierOption, b: CourierOption) =>
          a.rate <= b.rate ? a : b
        );

        const expCourier = flat.reduce((a: CourierOption, b: CourierOption) => {
          const aDays = parseEtd(a.estimated_delivery)?.from ?? 999;
          const bDays = parseEtd(b.estimated_delivery)?.from ?? 999;
          return aDays <= bDays ? a : b;
        });

        let expressFinal = expCourier;

        if (expCourier.courier_company_id === stdCourier.courier_company_id) {
          const secondFastest = flat
            .filter(c => c.courier_company_id !== stdCourier.courier_company_id)
            .sort((a, b) => {
              const aDays = parseEtd(a.estimated_delivery)?.from?.getTime() ?? 999999999;
              const bDays = parseEtd(b.estimated_delivery)?.from?.getTime() ?? 999999999;
              return aDays - bDays;
            })[0];

          if (secondFastest) expressFinal = secondFastest;
        }

        const newTiers: DeliveryTier[] = [
          { label: "standard", courier: stdCourier },
          { label: "express", courier: expressFinal }
        ];

        setTiers(newTiers);
        setSelectedTier("standard");
        setFetchedDeliveryKey(deliveryKey);
      } catch (e: any) {
        if (e.name !== "AbortError") setDeliveryError("error");
      } finally {
        setDeliveryLoading(false);
      }
    })();

    return () => controller.abort();
  }, [selectedAddr, addresses, paymentMethod, fetchedDeliveryKey, tiers.length, cart, selectedItems]);

  // ── Derived values ────────────────────────────────────────────────────────

  const validCart: CartItemFull[] = cart.filter(
    (item): item is CartItemFull => !!item.product && typeof item.product.price === "number"
  );
  
  const selectedCart = validCart.filter(i => selectedItems.includes(i.product.id));

  const getUnitPrice = (product: Product) => getCatalogEffectivePrice(product)
  
  // ✅ FIXED: Calculate subtotal correctly
  const subtotal = selectedCart.reduce((sum, item) => {
    return sum + getUnitPrice(item.product) * item.quantity;
  }, 0);

  const activeTier = tiers.find(t => t.label === selectedTier) ?? tiers[0] ?? null;
  const standardTier = tiers.find(t => t.label === "standard") ?? null;
  const expressTier = tiers.find(t => t.label === "express") ?? null;
  const standardIncludedDeliveryCharge = getStandardIncludedDeliveryCharge();
  const fallbackStandardRate = lowestExpressRate ?? standardIncludedDeliveryCharge;
  const standardRate = lowestStandardRate ?? fallbackStandardRate;
  const expressRate = lowestExpressRate ?? standardRate;
  const codRate = lowestCodRate ?? standardRate;
  const standardTierRate = standardTier ? Math.max(0, Math.round(standardTier.courier.rate)) : Math.max(0, Math.round(standardRate));
  const expressTierRate = expressTier ? Math.max(0, Math.round(expressTier.courier.rate)) : Math.max(0, Math.round(expressRate));
  const codStandardDeliveryCharge = Math.max(0, Math.round(standardRate));
  
  // ─── Weight-based calculation using included delivery base (default ₹499) ──────────────────
  const standardHandlingCharge = getHandlingChargeForStandard(standardTierRate);
  const expressAdditionalDeliveryCharge = getExpressChargeAfterStandard(expressTierRate);
  
  // ─── Display values ────────────────────────────────────────────────
  const expressDisplayCharge = activeTier && selectedTier === "express" ? expressAdditionalDeliveryCharge : 0;
  const shipping = expressDisplayCharge;
  const giftWrapFee = giftWrap ? 9 : 0;
  const discount = appliedCoupon?.discount ?? 0;
  const codHandlingCharge = paymentMethod === "COD"
    ? getCodHandlingCharge(standardIncludedDeliveryCharge, Math.max(0, Math.round(codRate)))
    : 0;
  const standardHandlingBreakdown = splitHandlingCharge(standardHandlingCharge);
  const expressHandlingBreakdown = splitHandlingCharge(expressAdditionalDeliveryCharge);
  const codHandlingBreakdown = splitHandlingCharge(codHandlingCharge);
  const standardShippingCharge = paymentMethod === "COD"
    ? codHandlingCharge
    : standardHandlingCharge;
  const expressShippingCharge = expressAdditionalDeliveryCharge + (paymentMethod === "COD" ? codHandlingCharge : 0);
  const appliedShippingCharge = selectedTier === "express" ? expressShippingCharge : standardShippingCharge;
  const productOriginalSubtotal = selectedCart.reduce((sum, item) => {
    const originalUnitPrice = getCatalogOriginalEffectivePrice(item.product) ?? getCatalogEffectivePrice(item.product)
    return sum + originalUnitPrice * item.quantity
  }, 0)
  const productDiscountAmount = Math.max(0, productOriginalSubtotal - subtotal)
  const productDiscountPercent = productOriginalSubtotal > 0
    ? Math.round((productDiscountAmount / productOriginalSubtotal) * 100)
    : 0
  const productDiscountBreakdown = selectedCart
    .map(({ product, quantity }) => {
      const effectiveUnitPrice = getCatalogEffectivePrice(product)
      const originalUnitPrice = getCatalogOriginalEffectivePrice(product) ?? effectiveUnitPrice
      const lineDiscount = Math.max(0, Math.round((originalUnitPrice - effectiveUnitPrice) * quantity))
      const lineDiscountPercent = originalUnitPrice > 0
        ? Math.round(((originalUnitPrice - effectiveUnitPrice) / originalUnitPrice) * 100)
        : 0

      return {
        productId: product.id,
        title: product.title,
        lineDiscount,
        lineDiscountPercent,
      }
    })
    .filter(item => item.lineDiscount > 0)
  const displayedSubtotal = productOriginalSubtotal > 0 ? productOriginalSubtotal : subtotal;
  
  // ✅ FIXED: Calculate total correctly with new weight-based charges
  const total = Math.max(0, subtotal - discount + appliedShippingCharge + giftWrapFee);
  
  const savings = discount + productDiscountAmount;
  const couponDiscountLabel = appliedCoupon
    ? appliedCoupon.type === "pct"
      ? `${Math.round(appliedCoupon.value)}%`
      : `₹${Math.round(appliedCoupon.value)}`
    : null;

  const deliveryLabel = activeTier ? getDeliveryLabel(activeTier.courier) : null;

  const deliveryReady = !!activeTier && !deliveryLoading && deliveryError === null;
  const canCheckout = selectedItems.length > 0 && (!selectedAddress || deliveryReady);
  const checkoutBlocked = selectedItems.length > 0 && selectedAddress && !deliveryReady;

  // ── Cart helpers - FIXED TO PREVENT AUTO-INCREMENT ──
  const qty = (id: string) => validCart.find(i => i.product.id === id)?.quantity ?? 0;

  // ✅ FIXED: Use useCallback to prevent re-renders causing multiple calls
  const increase = useCallback((p: Product) => {
    const currentQty = qty(p.id);
    const maxStock = p.stock || 0;

    if (maxStock > 0 && currentQty >= maxStock) {
      return;
    }
    toggleCart({ ...p }, 1);
  }, [validCart, toggleCart]);

  // ✅ FIXED: Prevent auto-increment by using useCallback
  const decrease = useCallback((p: Product) => {
    const currentQty = qty(p.id);

    if (currentQty <= 1) {
      toggleCart({ ...p }, -9999);
    } else {
      toggleCart({ ...p }, -1);
    }
  }, [validCart, toggleCart]);

  const remove = useCallback((p: Product) => {
    toggleCart({ ...p }, -9999);
  }, [toggleCart]);

  const applyCoupon = async (code?: string) => {
    const c = (code ?? couponInput).trim().toUpperCase();
    if (!c) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, cartTotal: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error);
        return;
      }
      setAppliedCoupon(data);
      setCouponInput("");
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

 const saveAddress = async (form: Partial<Address>) => {
  setAddrSaving(true);
  setAddrError("");
  try {
    const isEdit = Boolean(form.id);
    const res = await fetch("/api/addresses", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save address");
    }

    const updatedAddress: Address = await res.json();

    setAddresses(prev => {
      if (isEdit) {
        return prev.map(addr => {
          if (addr.id === updatedAddress.id) return updatedAddress;
          if (updatedAddress.isDefault) return { ...addr, isDefault: false };
          return addr;
        });
      }

      const next = updatedAddress.isDefault
        ? prev.map(addr => ({ ...addr, isDefault: false }))
        : prev;
      return [updatedAddress, ...next];
    });

    setSelectedAddr(updatedAddress.id);
    setShowAddrForm(false);
    setEditingAddr(null);
    toast.success(isEdit ? "Address updated" : "Address added");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save address. Try again.";
    setAddrError(msg);
    toast.error(msg);
  } finally {
    setAddrSaving(false);
  }
};

  const deleteAddress = async (id: string) => {
    const previous = addresses;
    const previousSelectedAddr = selectedAddr;
    const deleting = addresses.find(a => a.id === id);

    if (!deleting) return;

    const remaining = addresses.filter(a => a.id !== id);
    const hasDefault = remaining.some(a => a.isDefault);
    const normalized = !hasDefault && remaining.length > 0
      ? remaining.map((a, idx) => ({ ...a, isDefault: idx === 0 ? true : a.isDefault }))
      : remaining;

    setAddresses(normalized);
    if (selectedAddr === id) {
      setSelectedAddr(normalized[0]?.id || "");
    }

    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete address");
      }
      toast.success("Address deleted");
    } catch (error) {
      setAddresses(previous);
      setSelectedAddr(previousSelectedAddr);
      const msg = error instanceof Error ? error.message : "Failed to delete address.";
      setAddrError(msg);
      toast.error(msg);
    }
  };

  // ✅ FIXED: Proper checkout handler
const handleCheckout = async () => {
  if (!canCheckout || checkoutBlocked) return;

  // Address validation
  if (!selectedAddr) {
    setAddrError("Please select a delivery address");
    return;
  }

  // Payment method validation
  if (!paymentMethod) {
    setAddrError("Please select a payment method");
    return;
  }

  setCheckoutLoading(true);

  try {
    console.log("[Checkout Debug] Selected address state", {
      selectedAddr,
      selectedAddressId: selectedAddress?.id,
      selectedAddress,
      addressesCount: addresses.length,
    });

    const payload = {
      items: selectedCart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        title: item.product.title,
        price: getUnitPrice(item.product),
        weight: getProductWeightKg(item.product),
      })),
      address: selectedAddress,
      couponCode: appliedCoupon?.code || null,
      giftWrap,
      giftMessage,
      deliveryTier: selectedTier.toUpperCase(),
      paymentMethod, // ✅ added
    };

    console.log("[Checkout Debug] Payload address being sent", payload.address);

    const res = await fetch("/api/payment/create-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log("Sending address:", selectedAddress);
const text = await res.text();
console.log("Raw API response:", text);

let data;

try {
  data = JSON.parse(text);
} catch (err) {
  console.error("Response is not JSON:", text);
  setPopupMessage("Server Error \n Try Agian");
  setShowPopup(true);
  return;
}

console.log("Checkout response:", data);

if (!res.ok) {
  setPopupMessage(data.error || "Checkout failed");
  setShowPopup(true);
  return;
}

// ✅ Online payment
if (paymentMethod === "ONLINE") {
  setPopupMessage("Redirecting to payment...");
  setShowPopup(true);

  setTimeout(() => {
    const total = Number(data?.summary?.total ?? 0);
    const currency = encodeURIComponent(data?.currency ?? "INR");
    const keyId = encodeURIComponent(data?.keyId ?? "");
    const mock = data?.isMockPayment ? "1" : "0";
    window.location.href = `/payment?orderId=${data.orderId}&dbOrderId=${data.dbOrderId}&total=${Math.round(total)}&currency=${currency}&keyId=${keyId}&mock=${mock}`;
  }, 1500);

  return;
}

// ✅ COD order
if (paymentMethod === "COD") {
  setPopupMessage("Order placed successfully!");
  setShowPopup(true);

  setTimeout(() => {
    window.location.href = "/orders";
  }, 1500);

  return;
}

  } catch (error) {
    setAddrError(
      error instanceof Error ? error.message : "Failed to initiate checkout"
    );
  } finally {
    setCheckoutLoading(false);
  }
};

  if (loading) return <Loader />;
  if (validCart.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} className="text-pink-600" strokeWidth={2} />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Shopping Cart</h1>
            <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {validCart.length} item{validCart.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Link href="/products" className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1 transition-colors">
            Continue Shopping <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── LEFT ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Cart Items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <button
                  onClick={() => {
                    const allIds = validCart.map(i => i.product.id);
                    setSelectedItems(allIds.every(id => selectedItems.includes(id)) ? [] : allIds);
                  }}
                  className="flex items-center gap-2 group"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    validCart.every(i => selectedItems.includes(i.product.id))
                      ? "bg-pink-600 border-pink-600"
                      : validCart.some(i => selectedItems.includes(i.product.id))
                      ? "bg-pink-100 border-pink-400"
                      : "border-gray-300 group-hover:border-pink-400"
                  }`}>
                    {validCart.every(i => selectedItems.includes(i.product.id)) && <Check size={10} className="text-white" strokeWidth={3}/>}
                    {!validCart.every(i => selectedItems.includes(i.product.id)) && validCart.some(i => selectedItems.includes(i.product.id)) && <Minus size={10} className="text-pink-500" strokeWidth={3}/>}
                  </div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <Package size={17} className="text-pink-500"/> Cart Items
                  </h2>
                </button>
                <span className="text-xs text-gray-400">
                  {selectedItems.length > 0
                    ? `${selectedItems.length} of ${validCart.length} selected`
                    : `${validCart.reduce((s, i) => s + i.quantity, 0)} units`}
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {validCart.map(({ product, quantity }) => {
                    
                  const img = product.images?.[0] || "/images/No_Image_Available.jpg";
                  const effectiveUnitPrice = getCatalogEffectivePrice(product);
                  const originalUnitPrice = getCatalogOriginalEffectivePrice(product) ?? effectiveUnitPrice;
                  const itemDiscountPercent = getCatalogDiscountPercent(product);
                  const lineDisplayTotal = Math.round(effectiveUnitPrice * quantity);
                  const lineOriginalTotal = Math.round(originalUnitPrice * quantity);
                  const hasItemDiscount = lineOriginalTotal > lineDisplayTotal;
                  const isLowStock = product.stock && product.stock <= 5;
                  const isSelected = selectedItems.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => setSelectedItems(prev =>
                        prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                      )}
                      className={`p-5 flex gap-4 group transition-all cursor-pointer ${isSelected ? "" : "hover:bg-gray-50/50"}`}
                    >
                      <div className="shrink-0 flex items-start pt-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedItems(prev =>
                            prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                          )}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                            isSelected ? "bg-pink-600 border-pink-600" : "border-gray-300 hover:border-pink-400 bg-white"
                          }`}
                        >
                          {isSelected && <Check size={11} className="text-white" strokeWidth={3}/>}
                        </button>
                      </div>

                      <div className="relative shrink-0">
                        <div className={`w-24 h-24 rounded-xl overflow-hidden border transition-all ${isSelected ? "border-pink-200 shadow-md" : "border-gray-100"}`}>
                          <Image src={img} alt={product.title} width={96} height={96} className="object-cover w-full h-full" />
                        </div>
                        {isLowStock && (
                          <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Only {product.stock} left
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{product.title}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-400 capitalize">{product.category || "Uncategorized"}</p>
                              {hasItemDiscount && itemDiscountPercent > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                  {itemDiscountPercent}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); remove(product); }}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-lg font-black text-gray-900">₹{lineDisplayTotal}</span>
                            {hasItemDiscount && (
                              <p className="text-xs text-gray-400 line-through">₹{lineOriginalTotal}</p>
                            )}
                            {quantity > 1 && <span className="text-xs text-gray-400 ml-1.5">₹{Math.round(effectiveUnitPrice)} each</span>}
                          </div>
                          <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                          <button 
  onClick={async () => {
    try {
      await decrease(product)
    } catch (err) {
      // optional: handle error silently or show toast
    }
  }}
  type="button"
  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600"
>
  <Minus size={13} />
</button>
                            <span className="w-8 text-center font-bold text-sm text-gray-900">{quantity}</span>
                            <button 
                              onClick={() => increase(product)}
                              type="button"
                              disabled={!!(product.stock && quantity >= product.stock)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600 disabled:opacity-40"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Live delivery date per item */}
                        <div className="flex items-center gap-1 mt-2">
                          <Clock size={11} className={deliveryLabel ? "text-green-500" : "text-gray-300"} />
                          {deliveryLabel ? (
                            <span className="text-[11px] text-green-600 font-medium">{deliveryLabel}</span>
                          ) : deliveryLoading ? (
                            <span className="text-[11px] text-gray-400 animate-pulse">Checking delivery options…</span>
                          ) : selectedAddress ? (
                            deliveryError === "unavailable"
                              ? <span className="text-[11px] text-red-500">Delivery unavailable to this pincode</span>
                              : <span className="text-[11px] text-gray-400">Select address to see delivery date</span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Add address to see delivery date</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

           {/* Delivery Address */}
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
  <button onClick={() => setAddrExpanded(e => !e)}
    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
  >
    <h2 className="font-bold text-gray-900 flex items-center gap-2">
      <MapPin size={17} className="text-pink-500"/> Delivery Address
      {selectedAddress && <span className="text-xs font-normal text-gray-500">— {selectedAddress.city}</span>}
    </h2>
    {addrExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
  </button>

  {addrExpanded && (
    <div className="px-5 pb-5 space-y-3 border-t border-gray-50">
      {addrError && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle size={13}/> {addrError}
        </div>
      )}
      {addrLoading ? (
        <div className="space-y-2 pt-2">
          {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse"/>)}
        </div>
      ) : (
        <>
          {addresses.map(addr => {
            return (
              <div key={addr.id} onClick={() => setSelectedAddr(addr.id)}
                className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedAddr === addr.id ? "border-pink-300 bg-pink-50/60" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedAddr === addr.id ? "border-pink-600" : "border-gray-300"}`}>
                    {selectedAddr === addr.id && <div className="w-2 h-2 rounded-full bg-pink-600"/>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900">{addr.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      addr.type === "home" ? "bg-blue-50 text-blue-600" :
                      addr.type === "work" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"
                    }`}>{addr.type}</span>
                    {addr.isDefault && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">Default</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} – {addr.pincode}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none">
                      <path d="M3.5 2h2.8l1 2.5-1.5 1.5c.6 1.2 1.7 2.3 2.9 2.9L10.2 7.5 12.5 8.5v2.8c0 .7-.6 1.2-1.3 1.1C5.3 11.8 1.6 6.3 2.1 3.8c.1-.5.6-.8 1.1-.8h.3z"
                        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {addr.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); setEditingAddr(addr); setShowAddrForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"><Edit2 size={13}/></button>
                  <button onClick={e => { e.stopPropagation(); deleteAddress(addr.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
          {!showAddrForm ? (
            <button onClick={() => { setEditingAddr(null); setShowAddrForm(true); }}
              className="w-full flex items-center gap-2 justify-center py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50/30 transition-all"
            >
              <Plus size={15}/> Add New Address
            </button>
          ) : (
            <AddressForm
              initial={editingAddr ?? undefined}
              onSave={saveAddress}
              onCancel={() => { setShowAddrForm(false); setEditingAddr(null); }}
              saving={addrSaving}
            />
          )}
        </>
      )}
    </div>
  )}
</div>
    

            {/* Coupon */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Tag size={17} className="text-pink-500"/> Coupons & Offers
              </h2>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={3}/></div>
                    <div>
                      <p className="text-sm font-bold text-green-800">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-600">
                        {appliedCoupon.label}
                        {couponDiscountLabel ? ` — ${couponDiscountLabel} off, saving ₹${appliedCoupon.discount}` : ` — saving ₹${appliedCoupon.discount}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setAppliedCoupon(null); setCouponError(""); }}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-all"><X size={14}/></button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Enter coupon code" value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyCoupon()}
                      className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 uppercase placeholder:normal-case placeholder:text-gray-400"
                    />
                    <button onClick={() => applyCoupon()} disabled={couponLoading}
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-all flex items-center gap-2 disabled:opacity-60">
                      {couponLoading && <Loader2 size={13} className="animate-spin"/>} Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/> {couponError}</p>}
                  {availableCoupons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Available Offers</p>
                      {availableCoupons.map(c => (
                        <div key={c.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <div>
                            <span className="text-xs font-black text-gray-800 tracking-widest">{c.code}</span>
                            <p className="text-[11px] text-gray-500 mt-0.5">{c.label}{c.minOrder > 0 ? ` (min ₹${c.minOrder})` : ""}</p>
                          </div>
                          <button onClick={() => applyCoupon(c.code)} className="text-xs font-bold text-pink-600 hover:underline">Apply</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gift Wrap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center"><Gift size={18} className="text-pink-500"/></div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Gift Wrap</p>
                    <p className="text-xs text-gray-400">Premium wrapping with a personal message</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">+₹9</span>
                  <button onClick={() => setGiftWrap(g => !g)}
                    className={`w-11 h-6 rounded-full transition-all duration-300 relative ${giftWrap ? "bg-pink-600" : "bg-gray-200"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${giftWrap ? "left-5" : "left-0.5"}`}/>
                  </button>
                </div>
              </div>
              {giftWrap && (
                <textarea placeholder="Add a gift message (optional)..." value={giftMessage}
                  onChange={e => setGiftMessage(e.target.value)} rows={2}
                  className="mt-4 w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none placeholder:text-gray-400"
                />
              )}
            </div>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-bold text-gray-900">Order Summary</h2>
                </div>
<div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm mt-6">
  <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
    <p className="text-xs font-bold text-Black uppercase tracking-widest">
      Payment Method
    </p>
  </div>

  <div className="p-4 space-y-3">

    {/* Online Payment */}
    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
      ${paymentMethod === "ONLINE"
        ? "border-gray-900 bg-gray-50"
        : "border-gray-200 hover:border-gray-400"
      }`}>
      
      <div className="flex items-center gap-3">
        <input
          type="radio"
          name="paymentMethod"
          value="ONLINE"
          checked={paymentMethod === "ONLINE"}
          onChange={() => setPaymentMethod("ONLINE")}
          className="accent-gray-900"
        />

        <div>
          <p className="text-sm font-semibold text-gray-800">Online Payment</p>
          <p className="text-xs text-gray-400">
            UPI, Cards, NetBanking
          </p>
        </div>
      </div>

      <span className="text-xs font-semibold text-green-600">
        Recommended
      </span>
    </label>

    {/* Cash on Delivery */}
    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
      ${paymentMethod === "COD"
        ? "border-gray-900 bg-gray-50"
        : "border-gray-200 hover:border-gray-400"
      }`}>
      
      <div className="flex items-center gap-3">
        <input
          type="radio"
          name="paymentMethod"
          value="COD"
          checked={paymentMethod === "COD"}
          onChange={() => setPaymentMethod("COD")}
          className="accent-gray-900"
        />

        <div>
          <p className="text-sm font-semibold text-gray-800">Cash on Delivery</p>
          <p className="text-xs text-gray-400">
            Pay when order arrives
          </p>
        </div>
      </div>

      
    </label>

  </div>
</div>



                <div className="p-5 space-y-4">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({selectedCart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span className="font-semibold text-gray-900">₹{Math.round(displayedSubtotal)}</span>
                  </div>

                  {productDiscountBreakdown.length > 0 && (
                    <>
                      {productDiscountBreakdown.map((item) => (
                        <div key={item.productId} className="flex justify-between text-sm text-green-600">
                          <span className="truncate pr-2">
                            {item.title} Discount{item.lineDiscountPercent > 0 ? ` (${item.lineDiscountPercent}%)` : ""}
                          </span>
                          <span className="font-semibold whitespace-nowrap">−₹{item.lineDiscount}</span>
                        </div>
                      ))}
                      {productDiscountBreakdown.length > 1 && (
                        <div className="flex justify-between text-xs text-green-700 border-t border-green-100 pt-1">
                          <span>Total Product Discount{productDiscountPercent > 0 ? ` (${productDiscountPercent}%)` : ""}</span>
                          <span className="font-semibold">−₹{Math.round(productDiscountAmount)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* ─── Price Slab Info ───────────────────────────────────────
                  <div className="bg-blue-50/60 border border-blue-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-700 font-medium">
                      📦 <strong>₹180 standard delivery included</strong> in above price
                    </p>
                    <p className="text-[11px] text-blue-600 mt-1">
                      Select Express to upgrade delivery speed
                    </p>
                  </div> */}

                  {/* Coupon discount */}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">
                        Discount{appliedCoupon?.code ? ` (${appliedCoupon.code}${couponDiscountLabel ? ` • ${couponDiscountLabel}` : ""})` : ""}
                      </span>
                      <span className="font-semibold text-green-600">−₹{Math.round(discount)}</span>
                    </div>
                  )}

                  {/* ── Delivery price line ───────────────────────────────── */}
                  {selectedTier === "express" ? (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        Delivery
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border text-amber-600 bg-amber-50 border-amber-200">
                          ⚡ EXPRESS
                        </span>
                      </span>
                      {!selectedAddress ? (
                        <span className="text-gray-400 italic text-xs">Select address</span>
                      ) : deliveryLoading ? (
                        <span className="text-gray-400 animate-pulse text-xs">Calculating…</span>
                      ) : deliveryError ? (
                        <span className="text-red-400 text-xs">Unavailable</span>
                      ) : (
                        <span className={`min-w-24 flex items-center justify-end gap-1 font-semibold ${expressDisplayCharge === 0 ? "text-green-600" : "text-gray-900"}`}>
                          <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M3 3h13v13H3z" />
    <path d="M16 8h4l1 3v5h-5z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="17.5" cy="18.5" r="1.5" />
  </svg>
                          {expressDisplayCharge === 0 ? "FREE" : `₹${expressDisplayCharge}`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Delivery</span>
                      <span className={`min-w-24 flex items-center justify-end gap-1 font-semibold ${standardHandlingCharge === 0 ? "text-green-600" : "text-gray-900"}`}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M3 3h13v13H3z" />
    <path d="M16 8h4l1 3v5h-5z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="17.5" cy="18.5" r="1.5" />
  </svg>
  {standardHandlingCharge === 0 ? "FREE" : `₹${standardHandlingCharge}`}
</span>
                    </div>
                  )}

                  {/* Standard handling split: 60% packaging + 40% handling */}
                  {selectedTier === "standard" && paymentMethod !== "COD" && standardHandlingCharge > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Packaging Charges</span>
                        <span className="font-semibold text-gray-900">₹{standardHandlingBreakdown.packagingCharge}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Handling Fee</span>
                        <span className="font-semibold text-gray-900">₹{standardHandlingBreakdown.handlingFee}</span>
                      </div>
                    </>
                  )}

                  {/* Express handling split: 60% packaging + 40% handling */}
                  {selectedTier === "express" && paymentMethod !== "COD" && expressAdditionalDeliveryCharge > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Packaging Charges</span>
                        <span className="font-semibold text-gray-900">₹{expressHandlingBreakdown.packagingCharge}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Handling Fee</span>
                        <span className="font-semibold text-gray-900">₹{expressHandlingBreakdown.handlingFee}</span>
                      </div>
                    </>
                  )}

                  {/* COD handling split: 60% packaging + 40% handling */}
                  {paymentMethod === "COD" && codHandlingCharge > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Packaging Charges (COD 60%)</span>
                        {!selectedAddress ? (
                          <span className="text-gray-400 italic text-xs">Select address</span>
                        ) : deliveryLoading ? (
                          <span className="text-gray-400 animate-pulse text-xs">Calculating…</span>
                        ) : deliveryError ? (
                          <span className="text-red-400 text-xs">Unavailable</span>
                        ) : (
                          <span className="font-semibold text-gray-900">₹{codHandlingBreakdown.packagingCharge}</span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Handling Fee (COD 40%)</span>
                        {!selectedAddress ? (
                          <span className="text-gray-400 italic text-xs">Select address</span>
                        ) : deliveryLoading ? (
                          <span className="text-gray-400 animate-pulse text-xs">Calculating…</span>
                        ) : deliveryError ? (
                          <span className="text-red-400 text-xs">Unavailable</span>
                        ) : (
                          <span className="font-semibold text-gray-900">₹{codHandlingBreakdown.handlingFee}</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* ── Delivery tier selector ─────────────────────────── */}
                  {!deliveryLoading && !deliveryError && tiers.length > 0 && (() => {
                    const std = tiers.find(t => t.label === "standard")!;
                    const exp = tiers.find(t => t.label === "express");

                    return (
                      <div className="rounded-xl border border-gray-100 bg-gray-50/60 overflow-hidden">

                        {/* ── Standard row ── */}
                        <button
                          type="button"
                          onClick={() => setSelectedTier("standard")}
                          className="w-full flex items-center gap-2.5 p-3 group hover:bg-gray-100/60 transition-colors"
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selectedTier === "standard" ? "border-pink-500" : "border-gray-300 group-hover:border-pink-300"}`}>
                            {selectedTier === "standard" && <div className="w-1.5 h-1.5 rounded-full bg-pink-500"/>}
                          </div>
                          <Truck size={12} className="text-blue-400 shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <span className="text-xs font-semibold text-gray-800">Standard Delivery</span>
                            {getDeliveryLabel(std.courier) && (
                              <span className="text-[10px] text-gray-400 ml-1.5">
                                · {getDeliveryLabel(std.courier)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`min-w-24 flex items-center justify-end gap-1 text-sm font-semibold ${standardHandlingCharge === 0 ? "text-green-600" : "text-gray-700"}`}>
                             
                              {standardHandlingCharge === 0 ? "FREE" : `₹${standardHandlingCharge}`}
                            </span>
                          </div>
                        </button>

                        {/* ── Express row — only if available ── */}
                        {exp && (() => {
                          const expLabel = getDeliveryLabel(exp.courier);
                          const isActive = selectedTier === "express";
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedTier("express")}
                              className="w-full flex items-center gap-2.5 p-3 group hover:bg-gray-100/60 transition-colors border-t border-gray-200/70"
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${isActive ? "border-amber-500" : "border-gray-300 group-hover:border-amber-300"}`}>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"/>}
                              </div>
                              <Zap size={12} className="text-amber-400 fill-amber-300 shrink-0"/>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-gray-800">Fast Delivery</span>
                                  <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-full">FASTEST</span>
                                </div>
                                {expLabel && <p className="text-[10px] text-green-600">· {expLabel}</p>}
                                <p className="text-[10px] text-gray-400 truncate">{exp.courier.courier_name}</p>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`min-w-24 flex items-center justify-end gap-1 text-sm font-semibold ${expressAdditionalDeliveryCharge === 0 ? "text-green-600" : "text-gray-700"}`}>
                                  {expressAdditionalDeliveryCharge === 0 ? "FREE" : `₹${expressAdditionalDeliveryCharge}`}
                                </span>
                                {expressAdditionalDeliveryCharge > 0 && (
                                  <span className="text-[9px] text-gray-400">Surcharge</span>
                                )}
                              </div>
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Loading skeleton for tier selector */}
                  {deliveryLoading && selectedAddress && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-200 animate-pulse shrink-0"/>
                        <div className="w-36 h-3 rounded bg-gray-200 animate-pulse"/>
                        <div className="ml-auto w-8 h-3 rounded bg-gray-200 animate-pulse"/>
                      </div>
                      <div className="flex items-center gap-2 opacity-60">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-200 animate-pulse shrink-0"/>
                        <div className="w-28 h-3 rounded bg-gray-200 animate-pulse"/>
                        <div className="ml-auto w-10 h-3 rounded bg-gray-200 animate-pulse"/>
                      </div>
                    </div>
                  )}

                  {/* No address yet */}
                  {!selectedAddress && !deliveryLoading && (
                    <p className="text-[11px] text-gray-400 italic">Add a delivery address to see shipping options</p>
                  )}

                  {/* Gift wrap */}
                  {giftWrap && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Gift Wrap</span>
                      <span className="font-semibold text-gray-900">₹{giftWrapFee}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-black text-gray-900">₹{Math.round(total)}</span>
                  </div>

                  {/* Savings banner */}
                  {savings > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Star size={13} className="fill-green-500 text-green-500 shrink-0"/>
                      <p className="text-xs font-semibold text-green-700">You're saving ₹{Math.round(savings)} on this order!</p>
                    </div>
                  )}
                </div>

                {/* ── Checkout Button ── */}
                <div className="px-5 pb-5 space-y-2">
                  <button
                    onClick={handleCheckout}
                    disabled={selectedItems.length === 0 || checkoutBlocked || checkoutLoading}
                    className={`block w-full text-center py-4 rounded-xl shadow-lg font-bold text-base transition-all duration-300 ${
                      selectedItems.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : checkoutBlocked || checkoutLoading
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-linear-to-r from-gray-900 to-gray-800 hover:from-pink-600 hover:to-rose-600 text-white"
                    }`}
                  >
                    {checkoutLoading && <Loader2 size={16} className="animate-spin inline mr-2"/>}
                    {selectedItems.length === 0
                      ? "Select items to checkout"
                      : deliveryLoading
                      ? "Checking delivery…"
                      : deliveryError === "unavailable"
                      ? "Delivery not available to this pincode"
                      : deliveryError === "error"
                      ? "Could not load delivery options"
                      : "Proceed to Checkout"
                    }
                  </button>

                  <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Shield size={11}/> Secured by 256-bit SSL encryption
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">We Accept</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                    <span className="text-xs text-green-600 font-semibold">Secured</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-4 gap-2">
                  {[
                    { name:"UPI",        c:"from-violet-50 to-purple-50", b:"border-violet-100", svg:<svg viewBox="0 0 48 48" className="w-7 h-7" fill="none"><rect width="48" height="48" rx="10" fill="#6D28D9" opacity="0.1"/><text x="24" y="30" textAnchor="middle" fontSize="13" fontWeight="800" fill="#6D28D9" fontFamily="sans-serif">UPI</text></svg> },
                    { name:"Visa",       c:"from-blue-50 to-sky-50",     b:"border-blue-100",   svg:<svg viewBox="0 0 48 28" className="w-10 h-6" fill="none"><path d="M18.5 22H14.2L17 6h4.3L18.5 22zm-8.1 0H6L9.2 9.4c.2-.7.8-1.4 1.6-1.4h6.7l-.7 4h-4c-.4 0-.7.3-.8.7L10.4 22zm29.3 0h-4l-.4-1.8h-5.5L29 22h-4.3l6-13.6C31.1 7.5 31.9 6 33.5 6H37l2.7 16zm-5.5-5.5l-1.5-7-2.6 7h4.1z" fill="#1A1F71"/></svg> },
                    { name:"Mastercard", c:"from-red-50 to-orange-50",   b:"border-red-100",    svg:<svg viewBox="0 0 48 30" className="w-10 h-7" fill="none"><circle cx="18" cy="15" r="11" fill="#EB001B"/><circle cx="30" cy="15" r="11" fill="#F79E1B"/><path d="M24 7.2a11 11 0 0 1 0 15.6A11 11 0 0 1 24 7.2z" fill="#FF5F00"/></svg> },
                    { name:"RuPay",      c:"from-green-50 to-emerald-50",b:"border-green-100",  svg:<svg viewBox="0 0 56 24" className="w-12 h-6" fill="none"><rect width="56" height="24" rx="5" fill="#1A7D3E" opacity="0.1"/><text x="28" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1A7D3E" fontFamily="sans-serif">RuPay</text></svg> },
                    { name:"NetBanking",c:"from-slate-50 to-gray-50",   b:"border-slate-100",  svg:<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none"><rect x="2" y="8" width="20" height="13" rx="2" stroke="#475569" strokeWidth="1.5"/><path d="M2 11h20" stroke="#475569" strokeWidth="1.5"/><path d="M12 3l9 5H3l9-5z" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round"/><rect x="6" y="15" width="3" height="3" rx="0.5" fill="#475569"/><rect x="10.5" y="15" width="3" height="3" rx="0.5" fill="#475569"/><rect x="15" y="15" width="3" height="3" rx="0.5" fill="#475569"/></svg> },
                    { name:"EMI",        c:"from-amber-50 to-yellow-50", b:"border-amber-100",  svg:<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none"><rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#D97706" strokeWidth="1.5"/><path d="M2 10h20" stroke="#D97706" strokeWidth="1.5"/><circle cx="7" cy="16" r="1.5" fill="#D97706"/><path d="M10 15.5h8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 17.5h5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                    { name:"Paytm",      c:"from-sky-50 to-blue-50",     b:"border-sky-100",    svg:<svg viewBox="0 0 48 24" className="w-12 h-6" fill="none"><rect width="48" height="24" rx="5" fill="#00BAF2" opacity="0.12"/><circle cx="12" cy="12" r="5" fill="#00BAF2"/><circle cx="12" cy="12" r="2.5" fill="white"/><text x="30" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill="#00BAF2" fontFamily="sans-serif">paytm</text></svg> },
                    { name:"PhonePe",    c:"from-purple-50 to-violet-50",b:"border-purple-100", svg:<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none"><rect width="24" height="24" rx="6" fill="#5F259F" opacity="0.12"/><path d="M12 4C8.7 4 6 6.7 6 10v8l3-2.5V10c0-1.7 1.3-3 3-3s3 1.3 3 3c0 1.2-.7 2.2-1.7 2.7L12 13.5V17l1.8-1c2.5-1.2 4.2-3.8 4.2-6.8C18 6.7 15.3 4 12 4z" fill="#5F259F"/></svg> },
                  ].map(({ name, svg, c, b }) => (
                    <div key={name} className={`flex flex-col items-center justify-center gap-2 py-3.5 px-2 rounded-xl bg-linear-to-br ${c} border ${b} hover:scale-105 hover:shadow-sm transition-all duration-150 cursor-default`}>
                      {svg}
                      <span className="text-[10px] font-bold text-gray-500 text-center leading-tight">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <RotateCcw size={14}/>, label: "7-Day Returns", color: "text-blue-500 bg-blue-50" },
                  { icon: <Shield size={14}/>,    label: "Secure Pay",    color: "text-green-500 bg-green-50" },
                  { icon: <Zap size={14}/>,       label: "Fast Delivery", color: "text-amber-500 bg-amber-50" },
                ].map(({ icon, label, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                    <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mx-auto mb-1.5`}>{icon}</div>
                    <p className="text-[10px] font-semibold text-gray-600 leading-tight">{label}</p>
                  </div>
                ))}
             
              </div>
            </div>
          </div>
        </div>
      </div>
       {showPopup && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
      <p className="text-gray-800 mb-4">{popupMessage}</p>

      <button
        onClick={() => setShowPopup(false)}
        className="px-4 py-2 bg-black text-white rounded"
      >
        OK
      </button>
    </div>
  </div>
)}
    </div>
    
  );
}