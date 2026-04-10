import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast'; // Optional: for nice notifications

export const useShop = (initialProducts: any[]) => {
  const [cart, setCart] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  // ─── Quantity Helpers ───────────────────────────────────────
  const getQuantity = (productId: string) => quantities[productId] || 1;

  const displayQuantity = (productId: string) => {
    const itemInCart = cart.find((item) => item.product.id === productId);
    return itemInCart ? itemInCart.quantity : (quantities[productId] || 1);
  };

  const increaseQuantity = (productId: string, stock: number) => {
    const currentQty = getQuantity(productId);
    if (currentQty < stock) {
      setQuantities((prev) => ({ ...prev, [productId]: currentQty + 1 }));
    } else {
      toast.error("Reached maximum available stock");
    }
  };

  const decreaseQuantity = (productId: string) => {
    const currentQty = getQuantity(productId);
    if (currentQty > 1) {
      setQuantities((prev) => ({ ...prev, [productId]: currentQty - 1 }));
    }
  };

  // ─── Cart Logic ─────────────────────────────────────────────
  const toggleCart = (product: any, qty: number) => {
    setCart((prevCart) => {
      const isItemInCart = prevCart.find((item) => item.product.id === product.id);

      if (qty === -999) {
        // Remove Item logic
        toast.success(`${product.title} removed from cart`);
        return prevCart.filter((item) => item.product.id !== product.id);
      }

      if (isItemInCart) {
        // Update existing item quantity
        return prevCart.map((item) =>
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }

      // Add new item
      toast.success(`${product.title} added to cart`);
      return [...prevCart, { product, quantity: qty }];
    });

    // Reset temporary quantity selector
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  // ─── Wishlist Logic ─────────────────────────────────────────
  const toggleWishlist = async (productId: string) => {
    setWishlist((prev) => {
      if (prev.includes(productId)) {
        toast.success("Removed from wishlist");
        return prev.filter((id) => id !== productId);
      } else {
        toast.success("Added to wishlist");
        return [...prev, productId];
      }
    });
    
    // Note: In a real app, you would also call your Prisma API here:
    // await fetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
  };

  return {
    cart,
    wishlist,
    quantities,
    displayQuantity,
    increaseQuantity,
    decreaseQuantity,
    toggleCart,
    toggleWishlist,
  };
};