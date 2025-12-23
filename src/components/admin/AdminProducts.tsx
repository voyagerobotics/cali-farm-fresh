import { useState, useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, useProductMutations, Product } from "@/hooks/useProducts";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/use-toast";

const AdminProducts = () => {
  const { products, isLoading, refetch } = useProducts(true);
  const { createProduct, updateProduct, deleteProduct, toggleVisibility } = useProductMutations();
  const { uploadImage, isUploading } = useImageUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    unit: "kg",
    description: "",
    category: "vegetables",
    stock_quantity: "",
    is_available: true,
    image_url: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      unit: "kg",
      description: "",
      category: "vegetables",
      stock_quantity: "",
      is_available: true,
      image_url: "",
    });
    setImagePreview(null);
    setImageFile(null);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        description: formData.description || null,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_available: formData.is_available,
        image_url: imageUrl || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        toast({ title: "Product updated successfully" });
      } else {
        await createProduct(productData);
        toast({ title: "Product added successfully" });
      }

      resetForm();
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      unit: product.unit,
      description: product.description || "",
      category: product.category || "vegetables",
      stock_quantity: product.stock_quantity?.toString() || "0",
      is_available: product.is_available ?? true,
      image_url: product.image_url || "",
    });
    setImagePreview(product.image_url || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      toast({ title: "Product deleted" });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    try {
      await toggleVisibility(product.id, !product.is_hidden);
      toast({ title: product.is_hidden ? "Product is now visible" : "Product is now hidden" });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Products ({products.length})</h2>
        <Button onClick={() => { setShowForm(true); setEditingProduct(null); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading text-lg font-semibold mb-4">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Product Image</label>
              <div className="flex items-start gap-4">
                <div 
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Click to upload</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="text-sm text-muted-foreground">
                  <p>Recommended: Square image</p>
                  <p>Max size: 5MB</p>
                  <p>Formats: JPEG, PNG, WebP, GIF</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                  placeholder="e.g., Fresh Tomatoes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (₹) *</label>
                <input 
                  type="number" 
                  required 
                  value={formData.price} 
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                  placeholder="e.g., 40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select 
                  value={formData.unit} 
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                >
                  <option value="kg">per kg</option>
                  <option value="piece">per piece</option>
                  <option value="bunch">per bunch</option>
                  <option value="dozen">per dozen</option>
                  <option value="250g">per 250g</option>
                  <option value="500g">per 500g</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                <input 
                  type="number" 
                  value={formData.stock_quantity} 
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                >
                  <option value="vegetables">Vegetables</option>
                  <option value="leafy">Leafy Greens</option>
                  <option value="fruits">Fruits</option>
                  <option value="herbs">Herbs</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_available} 
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>In Stock</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="w-full px-4 py-3 rounded-lg border border-input bg-background resize-none"
                rows={3}
                placeholder="Describe your product..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : editingProduct ? "Update Product" : "Add Product"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="grid gap-4">
        {products.map((product) => (
          <div 
            key={product.id} 
            className={`bg-card rounded-xl border p-4 flex items-center gap-4 ${
              product.is_hidden ? "opacity-50 border-dashed" : "border-border"
            }`}
          >
            {/* Product Image */}
            <div className="w-16 h-16 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{product.name}</h3>
                {product.is_hidden && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                )}
                {!product.is_available && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Out of Stock</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ₹{product.price} / {product.unit} • Stock: {product.stock_quantity ?? 0}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(product)}>
                {product.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;
