import { useState, useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Megaphone, ShoppingBag, Upload, X, ImageIcon, Bell, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePromotionalBanners, PromotionalBanner } from "@/hooks/usePromotionalBanners";
import { usePreOrders, PreOrder } from "@/hooks/usePreOrders";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminBanners = () => {
  const { banners, isLoading, createBanner, updateBanner, deleteBanner } = usePromotionalBanners(false);
  const { preOrders, isLoading: preOrdersLoading, updatePreOrderStatus } = usePreOrders(true);
  const { uploadImage, isUploading } = useImageUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editBanner, setEditBanner] = useState<PromotionalBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notifyingProduct, setNotifyingProduct] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    product_name: "",
    image_url: "",
    badge_text: "Coming Soon",
    cta_text: "Pre-Order Now",
    background_color: "#FEF3C7",
    text_color: "#92400E",
    is_active: true,
    payment_required: false,
  });

  const resetForm = () => {
    setForm({
      title: "", subtitle: "", description: "", product_name: "",
      image_url: "", badge_text: "Coming Soon", cta_text: "Pre-Order Now",
      background_color: "#FEF3C7", text_color: "#92400E", is_active: true,
      payment_required: false,
    });
    setEditBanner(null);
    setShowForm(false);
  };

  const openEdit = (banner: PromotionalBanner) => {
    setEditBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      product_name: banner.product_name,
      image_url: banner.image_url || "",
      badge_text: banner.badge_text || "Coming Soon",
      cta_text: banner.cta_text || "Pre-Order Now",
      background_color: banner.background_color || "#FEF3C7",
      text_color: banner.text_color || "#92400E",
      is_active: banner.is_active,
      payment_required: banner.payment_required || false,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "product-images");
    if (url) setForm(f => ({ ...f, image_url: url }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title || !form.product_name) return;
    if (editBanner) {
      await updateBanner(editBanner.id, form);
    } else {
      await createBanner(form);
    }
    resetForm();
  };

  const handleNotifyCustomers = async (banner: PromotionalBanner) => {
    setNotifyingProduct(banner.id);
    try {
      const { data, error } = await supabase.functions.invoke("notify-preorder-available", {
        body: { product_name: banner.product_name, banner_id: banner.id },
      });
      if (error) throw error;
      toast({
        title: "Customers Notified!",
        description: `${data.notified} customer(s) notified. ${data.emailsSent} email(s) sent.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setNotifyingProduct(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    fulfilled: "bg-green-100 text-green-800",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Count pending pre-orders per banner
  const pendingCountByBanner: Record<string, number> = {};
  preOrders.forEach(po => {
    if (po.status === "pending" && po.banner_id) {
      pendingCountByBanner[po.banner_id] = (pendingCountByBanner[po.banner_id] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Promotional Banners</h2>
          <p className="text-muted-foreground">Manage coming-soon banners and pre-orders</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Banner
        </Button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.product_name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: banner.background_color || '#FEF3C7' }}
                    >
                      <Megaphone className="w-6 h-6" style={{ color: banner.text_color || '#92400E' }} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{banner.title}</h3>
                    <p className="text-sm text-muted-foreground">{banner.product_name}</p>
                    <div className="flex gap-1 mt-1">
                      {banner.payment_required && (
                        <Badge variant="outline" className="text-xs"><CreditCard className="w-3 h-3 mr-1" /> Payment Required</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={banner.is_active ? "default" : "secondary"}>
                    {banner.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Notify button */}
                  {pendingCountByBanner[banner.id] > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNotifyCustomers(banner)}
                      disabled={notifyingProduct === banner.id}
                      className="text-primary border-primary"
                    >
                      {notifyingProduct === banner.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4 mr-1" />
                      )}
                      Notify ({pendingCountByBanner[banner.id]})
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => updateBanner(banner.id, { is_active: !banner.is_active })}>
                    {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(banner)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {banners.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No banners yet. Create one to promote upcoming products.
          </div>
        )}
      </div>

      {/* Pre-Orders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Pre-Orders ({preOrders.length})
          </CardTitle>
          <CardDescription>Customer pre-orders from promotional banners</CardDescription>
        </CardHeader>
        <CardContent>
          {preOrdersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : preOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pre-orders yet.</p>
          ) : (
            <div className="space-y-3">
              {preOrders.map((po: PreOrder) => (
                <div key={po.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 flex-wrap gap-3">
                  <div>
                    <p className="font-medium">{po.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {po.product_name} × {po.quantity} • {po.customer_phone}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {po.payment_status !== "not_required" && (
                        <Badge variant="outline" className="text-xs">
                          Payment: {po.payment_status === "paid" ? "✅ Paid" : "⏳ " + po.payment_status}
                          {po.payment_amount > 0 && ` (₹${po.payment_amount})`}
                        </Badge>
                      )}
                    </div>
                    {po.notes && <p className="text-xs text-muted-foreground mt-1">Note: {po.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={po.status}
                      onValueChange={(val) => updatePreOrderStatus(po.id, val as PreOrder["status"])}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banner Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBanner ? "Edit Banner" : "Create Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input value={form.product_name} onChange={(e) => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. Watermelon" />
              </div>
              <div className="space-y-2">
                <Label>Badge Text</Label>
                <Input value={form.badge_text} onChange={(e) => setForm(f => ({ ...f, badge_text: e.target.value }))} placeholder="Coming Soon" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="🍉 Watermelon Season!" />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={form.subtitle} onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Fresh & Juicy" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Banner Image</Label>
              {form.image_url ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
                  <img src={form.image_url} alt="Banner preview" className="w-full h-full object-cover" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 w-8 h-8 rounded-full" onClick={() => setForm(f => ({ ...f, image_url: "" }))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /> : (
                    <>
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Click to upload image</p>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Or paste URL:</span>
                <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className="flex-1 h-8 text-sm" />
              </div>
            </div>

            {/* Payment Configuration */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Require Payment at Pre-Order
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.payment_required
                      ? "Customer must pay via Razorpay when placing pre-order"
                      : "Customer pays later when product is in stock"}
                  </p>
                </div>
                <Switch checked={form.payment_required} onCheckedChange={(v) => setForm(f => ({ ...f, payment_required: v }))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input value={form.cta_text} onChange={(e) => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Pre-Order Now" />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="pt-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.background_color} onChange={(e) => setForm(f => ({ ...f, background_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.background_color} onChange={(e) => setForm(f => ({ ...f, background_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.text_color} onChange={(e) => setForm(f => ({ ...f, text_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.text_color} onChange={(e) => setForm(f => ({ ...f, text_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl p-4 mt-4 relative overflow-hidden" style={{ backgroundColor: form.background_color, color: form.text_color }}>
              <p className="text-xs font-semibold opacity-60 mb-1">PREVIEW</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {form.badge_text && <Badge className="mb-2" style={{ backgroundColor: form.text_color, color: '#fff' }}>✨ {form.badge_text}</Badge>}
                  <h4 className="font-bold text-lg">{form.title || "Banner Title"}</h4>
                  {form.subtitle && <p className="opacity-80 text-sm">{form.subtitle}</p>}
                  {form.payment_required && <p className="text-xs opacity-70 mt-1">💳 Payment required at booking</p>}
                </div>
                {form.image_url && <img src={form.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={isUploading}>
              {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : editBanner ? "Update Banner" : "Create Banner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBanners;
