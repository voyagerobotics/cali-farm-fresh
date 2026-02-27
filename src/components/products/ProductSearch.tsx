import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/proxy-image-url";

interface ProductSearchProps {
  products: Product[];
  onSearch: (query: string) => void;
  onSelectProduct?: (product: Product) => void;
}

const ProductSearch = ({ products, onSearch, onSelectProduct }: ProductSearchProps) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const filtered = products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.description?.toLowerCase().includes(query.toLowerCase()) ||
            p.category?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleSuggestionClick = (product: Product) => {
    setQuery(product.name);
    setShowSuggestions(false);
    onSearch(product.name);
    onSelectProduct?.(product);
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-primary/20 text-primary font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for spinach, tomatoes, herbs..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="pl-12 pr-10 h-12 rounded-xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-fade-in">
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSuggestionClick(product)}
              className="w-full flex items-center gap-4 p-3 hover:bg-accent/50 transition-colors text-left"
            >
              {proxyImageUrl(product.image_url) ? (
                <img
                  src={proxyImageUrl(product.image_url)!}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-xl">🥬</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {highlightMatch(product.name, query)}
                </p>
                <p className="text-sm text-muted-foreground">
                  ₹{product.price} per {product.unit}
                </p>
              </div>
              {product.is_available && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  In Stock
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showSuggestions && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated p-4 z-50 animate-fade-in">
          <p className="text-muted-foreground text-center">
            No products found for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
