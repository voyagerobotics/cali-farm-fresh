import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import GoogleMapsLocationPicker from "@/components/GoogleMapsLocationPicker";
import { MapPin, Plus, Trash2, Save, Loader2, Navigation, Truck } from "lucide-react";

interface Zone {
  id: string;
  zone_name: string;
  min_distance_km: number;
  max_distance_km: number;
  delivery_charge: number;
  min_order_value: number | null;
  free_delivery_threshold: number | null;
  eta_minutes: number | null;
  is_active: boolean;
}

const BotDeliveryZones = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [convAddresses, setConvAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: z }, { data: a }, { data: c }] = await Promise.all([
      supabase.from("delivery_zones").select("*").order("min_distance_km"),
      supabase.from("user_addresses").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("whatsapp_conversations").select("phone_number, customer_name, delivery_name, delivery_address, delivery_city, delivery_pincode, delivery_latitude, delivery_longitude").not("delivery_address", "is", null),
    ]);
    setZones((z as Zone[]) || []);
    setAddresses(a || []);
    setConvAddresses((c as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, field: keyof Zone, value: any) =>
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));

  const saveZones = async () => {
    setSaving(true);
    for (const z of zones) {
      await supabase.from("delivery_zones").update({
        zone_name: z.zone_name,
        min_distance_km: Number(z.min_distance_km),
        max_distance_km: Number(z.max_distance_km),
        delivery_charge: Number(z.delivery_charge),
        min_order_value: Number(z.min_order_value ?? 0),
        free_delivery_threshold: z.free_delivery_threshold != null ? Number(z.free_delivery_threshold) : null,
        eta_minutes: z.eta_minutes != null ? Number(z.eta_minutes) : null,
        is_active: z.is_active,
      } as any).eq("id", z.id);
    }
    setSaving(false);
    toast({ title: "Delivery zones saved", description: "The bot applies these rules on the next order." });
  };

  const addZone = async () => {
    const { data, error } = await supabase.from("delivery_zones").insert({
      zone_name: "New zone", min_distance_km: 0, max_distance_km: 5, delivery_charge: 50, is_active: true,
    } as any).select().single();
    if (error) { toast({ title: "Could not add zone", description: error.message, variant: "destructive" }); return; }
    setZones((prev) => [...prev, data as Zone]);
  };

  const removeZone = async (id: string) => {
    await supabase.from("delivery_zones").delete().eq("id", id);
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const testLocation = async (loc: { address: string; city: string; pincode: string; latitude: number; longitude: number }) => {
    setPickerOpen(false);
    const { data, error } = await supabase.functions.invoke("calculate-delivery-distance", {
      body: { pincode: loc.pincode },
    });
    if (error) { toast({ title: "Could not check this address", description: error.message, variant: "destructive" }); return; }
    setTestResult({ ...loc, ...(data as any) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Delivery zones</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Charges by distance from the farm. Addresses outside the covered range get a polite refusal in WhatsApp.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addZone}><Plus className="w-4 h-4 mr-1" /> Add zone</Button>
            <Button onClick={saveZones} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {zones.map((z) => (
            <div key={z.id} className="grid md:grid-cols-7 gap-2 items-end rounded-lg border border-border p-3">
              <div className="md:col-span-2">
                <Label className="text-xs">Zone name</Label>
                <Input value={z.zone_name} onChange={(e) => patch(z.id, "zone_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">From (km)</Label>
                <Input type="number" value={z.min_distance_km} onChange={(e) => patch(z.id, "min_distance_km", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To (km)</Label>
                <Input type="number" value={z.max_distance_km} onChange={(e) => patch(z.id, "max_distance_km", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Charge ₹</Label>
                <Input type="number" value={z.delivery_charge} onChange={(e) => patch(z.id, "delivery_charge", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Min order ₹</Label>
                <Input type="number" value={z.min_order_value ?? 0} onChange={(e) => patch(z.id, "min_order_value", e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-xs">ETA (min)</Label>
                  <Input type="number" value={z.eta_minutes ?? ""} onChange={(e) => patch(z.id, "eta_minutes", e.target.value)} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Switch checked={z.is_active} onCheckedChange={(v) => patch(z.id, "is_active", v)} />
                  <Button size="icon" variant="ghost" onClick={() => removeZone(z.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
          {!loading && !zones.length && <p className="text-sm text-muted-foreground">No zones configured yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Navigation className="w-4 h-4" /> Test an address</CardTitle>
          <Button variant="outline" onClick={() => setPickerOpen(true)}><MapPin className="w-4 h-4 mr-1" /> Drop a pin</Button>
        </CardHeader>
        <CardContent>
          {testResult ? (
            <div className="text-sm space-y-1">
              <p className="font-medium">{testResult.address}</p>
              <p className="text-muted-foreground">{testResult.city} — {testResult.pincode}</p>
              {testResult.deliveryUnavailable ? (
                <Badge variant="destructive">Outside delivery range{testResult.distanceKm ? ` (${testResult.distanceKm} km)` : ""}</Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                  Deliverable • {testResult.distanceKm} km • ₹{testResult.deliveryCharge}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pick a location on the map to check serviceability, distance and charge.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Saved addresses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left">
                  <th className="p-3">Customer</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">Pincode</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Map</th>
                </tr>
              </thead>
              <tbody>
                {convAddresses.map((c) => (
                  <tr key={`wa-${c.phone_number}`} className="border-t border-border">
                    <td className="p-3">{c.customer_name || c.delivery_name || `+${c.phone_number}`}</td>
                    <td className="p-3 max-w-sm truncate">{c.delivery_address}</td>
                    <td className="p-3">{c.delivery_pincode || "—"}</td>
                    <td className="p-3"><Badge variant="secondary">WhatsApp</Badge></td>
                    <td className="p-3">
                      {c.delivery_latitude ? (
                        <a className="text-primary underline" target="_blank" rel="noreferrer"
                          href={`https://www.google.com/maps?q=${c.delivery_latitude},${c.delivery_longitude}`}>Open</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {addresses.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3">{a.full_name}</td>
                    <td className="p-3 max-w-sm truncate">{a.address}</td>
                    <td className="p-3">{a.pincode}</td>
                    <td className="p-3"><Badge variant="secondary">{a.label || "Website"}</Badge></td>
                    <td className="p-3">
                      {a.latitude ? (
                        <a className="text-primary underline" target="_blank" rel="noreferrer"
                          href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>Open</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {!convAddresses.length && !addresses.length && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No saved addresses yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <GoogleMapsLocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onLocationSelect={testLocation} />
    </div>
  );
};

export default BotDeliveryZones;
