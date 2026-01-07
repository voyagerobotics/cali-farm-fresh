import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscountBadgeProps {
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const DiscountBadge = ({ label, className, size = "md" }: DiscountBadgeProps) => {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-destructive text-destructive-foreground font-semibold rounded-full shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      <Tag className={cn(size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3")} />
      {label}
    </span>
  );
};

export default DiscountBadge;
