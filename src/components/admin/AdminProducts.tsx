import { useState, useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, Image as ImageIcon, Settings2, Percent, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, useProductMutations, Product } from "@/hooks/useProducts";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/use-toast";
import ProductVariantsManager from "./ProductVariantsManager";

const MAX_IMAGES = 4;

const AdminProducts = () => {
  const { products, isLoading, refetch } = useProducts(true);
  const { createProduct, updateProduct, deleteProduct, toggleVisibility } = useProductMutations();
  const { uploadImage, isUploading } = useImageUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [managingVariantsFor, setManagingVariantsFor] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    unit: "kg",
    description: "",
    category: "vegetables",
    stock_quantity: "",
    is_available: true,
    is_bestseller: false,
    is_fresh_today: false,
    discount_enabled: false,
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
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
      is_bestseller: false,
      is_fresh_today: false,
      discount_enabled: false,
      discount_type: "percentage",
      discount_value: "",
    });
    setImagePreviews([]);
    setImageFiles([]);
    setExistingImages([]);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalImages = existingImages.length + imageFiles.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `Maximum ${MAX_IMAGES} images allowed per product`,
        variant: "destructive",
      });
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getTotalImages = () => existingImages.length + imageFiles.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (getTotalImages() === 0) {
      toast({
        title: "Image required",
        description: "Please upload at least one product image",
        variant: "destructive",
      });
      return;
    }

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      const allImageUrls = [...existingImages, ...uploadedUrls];

      const productData: any = {
        name: formData.name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        description: formData.description || null,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_available: formData.is_available,
        is_bestseller: formData.is_bestseller,
        is_fresh_today: formData.is_fresh_today,
        image_url: allImageUrls[0] || null,
        image_urls: allImageUrls,
        discount_enabled: formData.discount_enabled,
        discount_type: formData.discount_enabled ? formData.discount_type : null,
        discount_value: formData.discount_enabled && formData.discount_value 
          ? parseFloat(formData.discount_value) 
          : null,
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
    
    const existingImageUrls = (product as any).image_urls?.length > 0 
      ? (product as any).image_urls 
      : product.image_url 
        ? [product.image_url] 
        : [];
    
    setExistingImages(existingImageUrls);
    setImagePreviews([]);
    setImageFiles([]);
    
    setFormData({
      name: product.name,
      price: product.price.toString(),
      unit: product.unit,
      description: product.description || "",
      category: product.category || "vegetables",
      stock_quantity: product.stock_quantity?.toString() || "0",
      is_available: product.is_available ?? true,
      is_bestseller: product.is_bestseller ?? false,
      is_fresh_today: product.is_fresh_today ?? false,
      discount_enabled: product.discount_enabled ?? false,
      discount_type: (product.discount_type as "percentage" | "flat") || "percentage",
      discount_value: product.discount_value?.toString() || "",
    });
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

  const getProductImageCount = (product: Product) => {
    const urls = (product as any).image_urls;
    if (urls && urls.length > 0) return urls.length;
    return product.image_url ? 1 : 0;
  };

  const getDiscountLabel = (product: Product) => {
    if (!product.discount_enabled || !product.discount_value) return null;
    if (product.discount_type === "percentage") {
      return `${product.discount_value}% OFF`;
    }
    return `₹${product.discount_value} OFF`;
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
      {/* Variants Manager Modal */}
      {managingVariantsFor && (
        <ProductVariantsManager
          productId={managingVariantsFor.id}
          productName={managingVariantsFor.name}
          onClose={() => setManagingVariantsFor(null)}
        />
      )}

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
            {/* Multiple Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Images <span className="text-muted-foreground">({getTotalImages()}/{MAX_IMAGES})</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {existingImages.map((url, index) => (
                  <div
                    key={`existing-${index}`}
                    className="w-24 h-24 rounded-lg border-2 border-border overflow-hidden relative group"
                  >
                    <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                ))}

                {imagePreviews.map((preview, index) => (
                  <div
                    key={`new-${index}`}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-primary overflow-hidden relative group"
                  >
                    <img src={preview} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-secondary text-secondary-foreground px-1 rounded">
                      New
                    </span>
                  </div>
                ))}

                {getTotalImages() < MAX_IMAGES && (
                  <div
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                multiple
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upload 1-4 images. First image will be the primary display image. Max 5MB each.
              </p>
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
                <label className="block text-sm font-medium mb-1">Base Price (₹) *</label>
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
                  <option value="combos">Chemical Free Combos</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>In Stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bestseller}
                    onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Best Seller</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_fresh_today}
                    onChange={(e) => setFormData({ ...formData, is_fresh_today: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Fresh Today</span>
                </label>
              </div>
            </div>

            {/* Discount Section */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={formData.discount_enabled}
                  onChange={(e) => setFormData({ ...formData, discount_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <Tag className="w-4 h-4 text-destructive" />
                <span className="font-medium">Enable Discount</span>
              </label>
              
              {formData.discount_enabled && (
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount Type</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "flat" })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Discount Value {formData.discount_type === "percentage" ? "(%)" : "(₹)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.discount_type === "percentage" ? "100" : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background"
                      placeholder={formData.discount_type === "percentage" ? "e.g., 10" : "e.g., 50"}
                    />
                  </div>
                </div>
              )}
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
            <div className="w-16 h-16 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
              {getProductImageCount(product) > 1 && (
                <span className="absolute bottom-0 right-0 text-[10px] bg-black/70 text-white px-1 rounded-tl">
                  +{getProductImageCount(product) - 1}
                </span>
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
                {getDiscountLabel(product) && (
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-semibold">
                    {getDiscountLabel(product)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ₹{product.price} / {product.unit} • Stock: {product.stock_quantity ?? 0} • {getProductImageCount(product)} image(s)
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setManagingVariantsFor(product)}
                title="Manage Variants"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
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
