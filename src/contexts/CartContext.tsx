import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  quantity: number;
  image_url?: string;
  variantId?: string;
  variantName?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  totalSavings: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const trackAddToCart = async (item: Omit<CartItem, "quantity">) => {
    try {
      await supabase.from("user_activity_logs").insert([{
        user_id: null, // Will be null for guests, updated if logged in
        action_type: "add_to_cart",
        action_details: JSON.parse(JSON.stringify({
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          variant_name: item.variantName,
          session_id: getSessionId(),
        })),
        page_path: window.location.pathname,
      }]);
    } catch (error) {
      console.error("Error tracking add to cart:", error);
    }
  };

  const addItem = (item: Omit<CartItem, "quantity">) => {
    // Track add to cart
    trackAddToCart(item);
    
    setItems((prev) => {
      const cartKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
      const existing = prev.find((i) => {
        const existingKey = i.variantId ? `${i.id}-${i.variantId}` : i.id;
        return existingKey === cartKey;
      });
      
      if (existing) {
        return prev.map((i) => {
          const iKey = i.variantId ? `${i.id}-${i.variantId}` : i.id;
          return iKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i;
        });
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string, variantId?: string) => {
    setItems((prev) => prev.filter((i) => {
      if (variantId) {
        return !(i.id === id && i.variantId === variantId);
      }
      return i.id !== id;
    }));
  };

  const updateQuantity = (id: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(id, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (variantId) {
          return (i.id === id && i.variantId === variantId) ? { ...i, quantity } : i;
        }
        return i.id === id && !i.variantId ? { ...i, quantity } : i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        totalSavings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
