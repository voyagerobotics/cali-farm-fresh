import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, EyeOff, Package, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts, useProductMutations, Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { products, isLoading, refetch } = useProducts(true);
  const { createProduct, updateProduct, deleteProduct, toggleVisibility } = useProductMutations();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    unit: "kg",
    description: "",
    category: "vegetables",
    stock_quantity: "",
    is_available: true,
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth?type=admin");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        description: formData.description || null,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_available: formData.is_available,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        toast({ title: "Product updated successfully" });
      } else {
        await createProduct(productData);
        toast({ title: "Product added successfully" });
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({ name: "", price: "", unit: "kg", description: "", category: "vegetables", stock_quantity: "", is_available: true });
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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-lg font-semibold">Products ({products.length})</h2>
          <Button onClick={() => { setShowForm(true); setEditingProduct(null); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        {showForm && (
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="font-heading text-lg font-semibold mb-4">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name *" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background" />
              <input type="number" placeholder="Price (₹) *" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background" />
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background">
                <option value="kg">per kg</option>
                <option value="piece">per piece</option>
                <option value="bunch">per bunch</option>
                <option value="dozen">per dozen</option>
              </select>
              <input type="number" placeholder="Stock Quantity" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background" />
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background">
                <option value="vegetables">Vegetables</option>
                <option value="leafy">Leafy Greens</option>
                <option value="fruits">Fruits</option>
                <option value="herbs">Herbs</option>
              </select>
              <label className="flex items-center gap-2 px-4 py-3">
                <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} />
                <span>In Stock</span>
              </label>
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-4 py-3 rounded-lg border border-input bg-background md:col-span-2" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">{editingProduct ? "Update" : "Add"} Product</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); }}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {products.map((product) => (
            <div key={product.id} className={`bg-card rounded-xl border p-4 flex items-center justify-between ${product.is_hidden ? "opacity-50 border-dashed" : "border-border"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.is_hidden && <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>}
                  {!product.is_available && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Out of Stock</span>}
                </div>
                <p className="text-sm text-muted-foreground">₹{product.price} / {product.unit} • Stock: {product.stock_quantity ?? 0}</p>
              </div>
              <div className="flex items-center gap-2">
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
    </div>
  );
};

export default Admin;
