import { useEffect, useState } from "react";
import { Loader2, Phone, Mail, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Enquiry = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  location: string | null;
  interest: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "contacted", "quoted", "closed"];

const AdminFarmerEnquiries = () => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("farmer_enquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load enquiries");
    setRows((data as Enquiry[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("farmer_enquiries").update({ status }).eq("id", id);
    if (error) toast.error("Update failed");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("farmer_enquiries").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Farmer Enquiries</h2>
          <p className="text-sm text-muted-foreground">Requests submitted from the Farmers page form.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No enquiries yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.full_name}</span>
                    <Badge variant="secondary">FRM-{r.id.slice(0, 8).toUpperCase()}</Badge>
                    {r.interest && <Badge variant="outline">{r.interest}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                      <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="destructive" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-primary"><Phone className="w-3.5 h-3.5" />{r.phone}</a>
                  {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="w-3.5 h-3.5" />{r.email}</a>}
                  {r.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.location}</span>}
                  <span>{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                </div>
                {r.message && <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3">{r.message}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFarmerEnquiries;
