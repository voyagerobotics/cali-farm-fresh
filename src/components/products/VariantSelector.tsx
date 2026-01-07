import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { ProductVariant } from "@/hooks/useProductVariants";
import { cn } from "@/lib/utils";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
  basePrice: number;
  discountedPrice?: number;
}

const VariantSelector = ({
  variants,
  selectedVariant,
  onSelect,
  basePrice,
  discountedPrice,
}: VariantSelectorProps) => {
  const availableVariants = variants.filter((v) => v.is_available);

  if (availableVariants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Select Size:</p>
      <div className="flex flex-wrap gap-2">
        {availableVariants.map((variant) => {
          const isSelected = selectedVariant?.id === variant.id;
          const isOutOfStock = variant.stock_quantity !== null && variant.stock_quantity <= 0;

          return (
            <button
              key={variant.id}
              onClick={() => !isOutOfStock && onSelect(variant)}
              disabled={isOutOfStock}
              className={cn(
                "relative px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/50",
                isOutOfStock && "opacity-50 cursor-not-allowed line-through"
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span>{variant.name}</span>
                <span className="text-xs">₹{variant.price}</span>
              </div>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              {isOutOfStock && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-destructive text-destructive-foreground px-1 rounded whitespace-nowrap">
                  Out of Stock
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
