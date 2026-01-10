import { useState } from "react";
import { Settings, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { settings, updateSettings, isLoading } = useSiteSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showSeasonalBox, setShowSeasonalBox] = useState(settings.show_seasonal_box);

  // Sync local state when settings load
  useState(() => {
    setShowSeasonalBox(settings.show_seasonal_box);
  });

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSettings({ show_seasonal_box: showSeasonalBox });
    setIsSaving(false);
    
    if (success) {
      toast({
        title: "Settings Saved",
        description: "Your site settings have been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading">Site Settings</h2>
        <p className="text-muted-foreground">Manage your website visibility options</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Homepage Sections
          </CardTitle>
          <CardDescription>
            Control which sections are visible on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seasonal Box Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-4">
              {showSeasonalBox ? (
                <Eye className="w-5 h-5 text-primary" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="seasonal-box" className="text-base font-medium">
                  Seasonal Vegetable Box
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show or hide the seasonal vegetable box banner on the products section
                </p>
              </div>
            </div>
            <Switch
              id="seasonal-box"
              checked={showSeasonalBox}
              onCheckedChange={setShowSeasonalBox}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Configuration</CardTitle>
          <CardDescription>
            Current delivery charge settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Store Location</p>
                <p className="font-medium">
                  105, Gali no 3, Wakekar layout, Ambika nagar, Ayodhyanagar, Nagpur - 440024
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="font-medium text-primary">₹20 per km</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Delivery charges are calculated based on distance from the store location to the customer's pincode.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
