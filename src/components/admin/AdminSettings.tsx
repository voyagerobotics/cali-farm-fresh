import { useState, useEffect } from "react";
import { Settings, Eye, EyeOff, Save, Loader2, Package, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

const AdminSettings = () => {
  const { settings, updateSettings, isLoading } = useSiteSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [showSeasonalBox, setShowSeasonalBox] = useState(settings.show_seasonal_box);
  const [seasonalBoxTitle, setSeasonalBoxTitle] = useState(settings.seasonal_box_title);
  const [seasonalBoxDescription, setSeasonalBoxDescription] = useState(settings.seasonal_box_description);
  const [seasonalBoxPrice, setSeasonalBoxPrice] = useState(settings.seasonal_box_price);
  const [seasonalBoxBadge, setSeasonalBoxBadge] = useState(settings.seasonal_box_badge);
  const [seasonalBoxButtonText, setSeasonalBoxButtonText] = useState(settings.seasonal_box_button_text);
  const [orderDays, setOrderDays] = useState<string[]>(settings.order_days);
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(settings.delivery_time_slot);

  // Sync local state when settings load
  useEffect(() => {
    setShowSeasonalBox(settings.show_seasonal_box);
    setSeasonalBoxTitle(settings.seasonal_box_title);
    setSeasonalBoxDescription(settings.seasonal_box_description);
    setSeasonalBoxPrice(settings.seasonal_box_price);
    setSeasonalBoxBadge(settings.seasonal_box_badge);
    setSeasonalBoxButtonText(settings.seasonal_box_button_text);
    setOrderDays(settings.order_days);
    setDeliveryTimeSlot(settings.delivery_time_slot);
  }, [settings]);

  const handleDayToggle = (day: string) => {
    setOrderDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (orderDays.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one order day.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const success = await updateSettings({
      show_seasonal_box: showSeasonalBox,
      seasonal_box_title: seasonalBoxTitle,
      seasonal_box_description: seasonalBoxDescription,
      seasonal_box_price: seasonalBoxPrice,
      seasonal_box_badge: seasonalBoxBadge,
      seasonal_box_button_text: seasonalBoxButtonText,
      order_days: orderDays,
      delivery_time_slot: deliveryTimeSlot,
    });
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
        <p className="text-muted-foreground">Manage your website visibility and content options</p>
      </div>

      {/* Order Days Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Order Days
          </CardTitle>
          <CardDescription>
            Select which days customers can place orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  orderDays.includes(day.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/30 border-border hover:border-primary/50'
                }`}
                onClick={() => handleDayToggle(day.id)}
              >
                <Checkbox
                  checked={orderDays.includes(day.id)}
                  onCheckedChange={() => handleDayToggle(day.id)}
                />
                <Label className="cursor-pointer">{day.label}</Label>
              </div>
            ))}
          </div>

          {/* Visual Summary of Selected Days */}
          {orderDays.length > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Currently Selected:</span>
              </div>
              <p className="text-foreground font-semibold text-lg">
                {orderDays
                  .sort((a, b) => {
                    const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                  .join(' & ')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Customers can place orders on these days
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="delivery-slot">Delivery Time Slot</Label>
            </div>
            <Input
              id="delivery-slot"
              value={deliveryTimeSlot}
              onChange={(e) => setDeliveryTimeSlot(e.target.value)}
              placeholder="e.g., 12:00 PM - 3:00 PM"
              className="max-w-xs"
            />
            {deliveryTimeSlot && (
              <p className="text-sm text-muted-foreground mt-2">
                Deliveries will be made during: <strong className="text-foreground">{deliveryTimeSlot}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Box Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Seasonal Vegetable Box
          </CardTitle>
          <CardDescription>
            Customize the seasonal vegetable box banner on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-4">
              {showSeasonalBox ? (
                <Eye className="w-5 h-5 text-primary" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="seasonal-box" className="text-base font-medium">
                  Show Seasonal Box
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display the seasonal vegetable box banner on the products section
                </p>
              </div>
            </div>
            <Switch
              id="seasonal-box"
              checked={showSeasonalBox}
              onCheckedChange={setShowSeasonalBox}
            />
          </div>

          {/* Customization Fields */}
          {showSeasonalBox && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="box-title">Title</Label>
                  <Input
                    id="box-title"
                    value={seasonalBoxTitle}
                    onChange={(e) => setSeasonalBoxTitle(e.target.value)}
                    placeholder="Seasonal Vegetable Box"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box-badge">Badge Text</Label>
                  <Input
                    id="box-badge"
                    value={seasonalBoxBadge}
                    onChange={(e) => setSeasonalBoxBadge(e.target.value)}
                    placeholder="Best Value"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="box-description">Description</Label>
                <Textarea
                  id="box-description"
                  value={seasonalBoxDescription}
                  onChange={(e) => setSeasonalBoxDescription(e.target.value)}
                  placeholder="A curated mix of seasonal vegetables..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="box-price">Price (₹)</Label>
                  <Input
                    id="box-price"
                    type="number"
                    value={seasonalBoxPrice}
                    onChange={(e) => setSeasonalBoxPrice(Number(e.target.value))}
                    placeholder="299"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box-button">Button Text</Label>
                  <Input
                    id="box-button"
                    value={seasonalBoxButtonText}
                    onChange={(e) => setSeasonalBoxButtonText(e.target.value)}
                    placeholder="Order Now"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Homepage Sections */}
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
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional section visibility controls can be added here.
          </p>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;