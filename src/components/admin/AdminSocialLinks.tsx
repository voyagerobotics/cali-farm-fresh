import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Loader2, Save, X, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSocialLinks, SocialLink } from "@/hooks/useSocialLinks";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram", icon: "instagram" },
  { value: "facebook", label: "Facebook", icon: "facebook" },
  { value: "youtube", label: "YouTube", icon: "youtube" },
  { value: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { value: "twitter", label: "Twitter/X", icon: "twitter" },
  { value: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { value: "telegram", label: "Telegram", icon: "telegram" },
];

const AdminSocialLinks = () => {
  const { socialLinks, isLoading, addSocialLink, updateSocialLink, deleteSocialLink } = useSocialLinks(true);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [formData, setFormData] = useState({
    platform: "",
    url: "",
    icon: "",
    display_order: 0,
    is_visible: true,
  });

  const handleOpenDialog = (link?: SocialLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        platform: link.platform,
        url: link.url,
        icon: link.icon,
        display_order: link.display_order,
        is_visible: link.is_visible,
      });
    } else {
      setEditingLink(null);
      setFormData({
        platform: "",
        url: "",
        icon: "",
        display_order: socialLinks.length + 1,
        is_visible: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handlePlatformChange = (value: string) => {
    const platform = PLATFORM_OPTIONS.find((p) => p.value === value);
    setFormData({
      ...formData,
      platform: platform?.label || value,
      icon: platform?.icon || value.toLowerCase(),
    });
  };

  const handleSubmit = async () => {
    if (!formData.platform || !formData.url) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingLink) {
        await updateSocialLink.mutateAsync({
          id: editingLink.id,
          ...formData,
        });
        toast({ title: "Success", description: "Social link updated successfully." });
      } else {
        await addSocialLink.mutateAsync(formData);
        toast({ title: "Success", description: "Social link added successfully." });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save social link.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this social link?")) return;

    try {
      await deleteSocialLink.mutateAsync(id);
      toast({ title: "Success", description: "Social link deleted successfully." });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete social link.",
        variant: "destructive",
      });
    }
  };

  const handleToggleVisibility = async (link: SocialLink) => {
    try {
      await updateSocialLink.mutateAsync({
        id: link.id,
        is_visible: !link.is_visible,
      });
      toast({
        title: link.is_visible ? "Link Hidden" : "Link Visible",
        description: `${link.platform} link is now ${link.is_visible ? "hidden" : "visible"}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update visibility.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Social Media Links
            </CardTitle>
            <CardDescription>
              Manage your social media links displayed in the footer
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {socialLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No social links configured yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
              Add Your First Link
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {socialLinks.map((link) => (
              <div
                key={link.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  link.is_visible ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{link.platform}</span>
                    {!link.is_visible && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleVisibility(link)}
                    title={link.is_visible ? "Hide link" : "Show link"}
                  >
                    {link.is_visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(link)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Social Link" : "Add Social Link"}</DialogTitle>
            <DialogDescription>
              {editingLink
                ? "Update the social media link details."
                : "Add a new social media link to display in the footer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={PLATFORM_OPTIONS.find((p) => p.label === formData.platform)?.value || ""}
                onValueChange={handlePlatformChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label>Visible</Label>
                <p className="text-sm text-muted-foreground">Show this link in the footer</p>
              </div>
              <Switch
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={addSocialLink.isPending || updateSocialLink.isPending}>
                {(addSocialLink.isPending || updateSocialLink.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingLink ? "Update" : "Add"} Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminSocialLinks;
