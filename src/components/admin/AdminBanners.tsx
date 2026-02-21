import { useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Megaphone, ShoppingBag } from "lucide-react";
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

const AdminBanners = () => {
  const { banners, isLoading, createBanner, updateBanner, deleteBanner } = usePromotionalBanners(false);
  const { preOrders, isLoading: preOrdersLoading, updatePreOrderStatus } = usePreOrders(true);
  const [editBanner, setEditBanner] = useState<PromotionalBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
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
  });

  const resetForm = () => {
    setForm({
      title: "", subtitle: "", description: "", product_name: "",
      image_url: "", badge_text: "Coming Soon", cta_text: "Pre-Order Now",
      background_color: "#FEF3C7", text_color: "#92400E", is_active: true,
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
    });
    setShowForm(true);
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: banner.background_color || '#FEF3C7' }}
                  >
                    <Megaphone className="w-6 h-6" style={{ color: banner.text_color || '#92400E' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{banner.title}</h3>
                    <p className="text-sm text-muted-foreground">{banner.product_name}</p>
                  </div>
                  <Badge variant={banner.is_active ? "default" : "secondary"}>
                    {banner.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
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
                <div key={po.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-medium">{po.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {po.product_name} × {po.quantity} • {po.customer_phone}
                    </p>
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
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
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
            <div
              className="rounded-lg p-4 mt-4"
              style={{ backgroundColor: form.background_color, color: form.text_color }}
            >
              <p className="text-xs font-semibold opacity-60 mb-1">PREVIEW</p>
              {form.badge_text && <Badge className="mb-2" style={{ backgroundColor: form.text_color, color: '#fff' }}>{form.badge_text}</Badge>}
              <h4 className="font-bold text-lg">{form.title || "Banner Title"}</h4>
              {form.subtitle && <p className="opacity-80">{form.subtitle}</p>}
            </div>

            <Button onClick={handleSave} className="w-full">
              {editBanner ? "Update Banner" : "Create Banner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBanners;
