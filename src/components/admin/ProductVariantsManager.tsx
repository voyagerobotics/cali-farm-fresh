import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductVariants, useVariantMutations, ProductVariant } from "@/hooks/useProductVariants";
import { useToast } from "@/hooks/use-toast";

interface ProductVariantsManagerProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

const PRESET_OPTIONS = [
  { name: "Per Piece", price: 0 },
  { name: "250 gm", price: 0 },
  { name: "500 gm", price: 0 },
  { name: "1 kg", price: 0 },
  { name: "2 kg", price: 0 },
];

const ProductVariantsManager = ({ productId, productName, onClose }: ProductVariantsManagerProps) => {
  const { variants, isLoading, refetch } = useProductVariants(productId);
  const { createVariant, updateVariant, deleteVariant, toggleVariantAvailability } = useVariantMutations();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock_quantity: "",
    is_available: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      stock_quantity: "",
      is_available: true,
    });
    setEditingVariant(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast({
        title: "Missing fields",
        description: "Please enter variant name and price",
        variant: "destructive",
      });
      return;
    }

    try {
      const variantData = {
        product_id: productId,
        name: formData.name,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_available: formData.is_available,
        display_order: variants.length,
      };

      if (editingVariant) {
        await updateVariant(editingVariant.id, variantData);
        toast({ title: "Variant updated" });
      } else {
        await createVariant(variantData);
        toast({ title: "Variant added" });
      }

      resetForm();
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      price: variant.price.toString(),
      stock_quantity: variant.stock_quantity?.toString() || "0",
      is_available: variant.is_available ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this variant?")) return;
    try {
      await deleteVariant(id);
      toast({ title: "Variant deleted" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleAvailability = async (variant: ProductVariant) => {
    try {
      await toggleVariantAvailability(variant.id, !variant.is_available);
      toast({
        title: variant.is_available ? "Variant disabled" : "Variant enabled",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addPresetVariant = (preset: { name: string; price: number }) => {
    setFormData({
      name: preset.name,
      price: preset.price.toString(),
      stock_quantity: "0",
      is_available: true,
    });
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Manage Variants</h2>
            <p className="text-sm text-muted-foreground">{productName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Add Presets */}
          <div>
            <p className="text-sm font-medium mb-2">Quick Add:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_OPTIONS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => addPresetVariant(preset)}
                  disabled={variants.some((v) => v.name === preset.name)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Variant Form */}
          {showForm && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">
                {editingVariant ? "Edit Variant" : "Add Variant"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                      placeholder="e.g., 500 gm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                      placeholder="e.g., 120"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_available}
                        onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Available</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    {editingVariant ? "Update" : "Add Variant"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Add Custom Variant Button */}
          {!showForm && (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Variant
            </Button>
          )}

          {/* Variants List */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">
              Variants ({variants.length})
            </h3>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No variants yet. Add variants to let customers choose different sizes.
              </p>
            ) : (
              <div className="space-y-2">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      variant.is_available ? "bg-card border-border" : "bg-muted/30 border-dashed opacity-60"
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{variant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{variant.price} • Stock: {variant.stock_quantity ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleAvailability(variant)}
                      >
                        {variant.is_available ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(variant)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(variant.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductVariantsManager;
