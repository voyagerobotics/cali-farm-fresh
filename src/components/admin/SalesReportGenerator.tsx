import { useState } from "react";
import { FileText, Mail, Download, Calendar, TrendingUp, ShoppingBag, Users, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SalesReportData {
  reportType: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newCustomers: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
}

const SalesReportGenerator = () => {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");
  const [adminEmail, setAdminEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const { toast } = useToast();

  const generateReport = async (sendEmail: boolean = false) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sales-report", {
        body: {
          reportType,
          adminEmail: sendEmail ? adminEmail : null,
        },
      });

      if (error) throw error;

      setReportData(data.data);
      
      if (sendEmail && adminEmail) {
        toast({
          title: "Report sent!",
          description: `${reportType === "weekly" ? "Weekly" : "Monthly"} sales report sent to ${adminEmail}`,
        });
      } else {
        toast({
          title: "Report generated!",
          description: "View the report details below",
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error generating report",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReportCSV = () => {
    if (!reportData) return;

    const rows = [
      ["Sales Report", reportData.reportType === "weekly" ? "Weekly" : "Monthly"],
      ["Date Range", `${reportData.startDate} to ${reportData.endDate}`],
      [""],
      ["Summary"],
      ["Total Orders", reportData.totalOrders.toString()],
      ["Total Revenue", `₹${reportData.totalRevenue}`],
      ["Average Order Value", `₹${reportData.averageOrderValue}`],
      ["New Customers", reportData.newCustomers.toString()],
      [""],
      ["Top Products"],
      ["Product", "Quantity Sold", "Revenue"],
      ...reportData.topProducts.map(p => [p.name, p.quantity.toString(), `₹${p.revenue}`]),
      [""],
      ["Daily Breakdown"],
      ["Date", "Orders", "Revenue"],
      ...reportData.dailyRevenue.map(d => [d.date, d.orders.toString(), `₹${d.revenue}`]),
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sales_report_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({ title: "Report downloaded!", description: "CSV file saved" });
  };

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold">Generate Sales Report</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v: "weekly" | "monthly") => setReportType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (Last 7 days)</SelectItem>
                <SelectItem value="monthly">Monthly (Last 30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Admin Email (Optional)</Label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={() => generateReport(false)} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
            {adminEmail && (
              <Button variant="outline" onClick={() => generateReport(true)} disabled={isGenerating}>
                <Mail className="w-4 h-4 mr-2" />
                Send via Email
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{reportData.totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">₹{reportData.averageOrderValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold">{reportData.newCustomers}</p>
              <p className="text-sm text-muted-foreground">New Customers</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-heading font-semibold mb-4">Top Selling Products</h4>
              {reportData.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No products sold in this period</p>
              ) : (
                <div className="space-y-2">
                  {reportData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span>{product.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{product.quantity} sold</p>
                        <p className="text-xs text-muted-foreground">₹{product.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders by Status */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-heading font-semibold mb-4">Orders by Status</h4>
              {reportData.ordersByStatus.length === 0 ? (
                <p className="text-muted-foreground text-sm">No orders in this period</p>
              ) : (
                <div className="space-y-2">
                  {reportData.ordersByStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="capitalize">{status.status.replace("_", " ")}</span>
                      <span className="font-medium">{status.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-heading font-semibold">Daily Breakdown</h4>
              <Button variant="outline" size="sm" onClick={exportReportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-right py-2 px-2 font-medium">Orders</th>
                    <th className="text-right py-2 px-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.dailyRevenue.map((day, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="py-2 px-2">
                        {new Date(day.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="text-right py-2 px-2 font-medium">{day.orders}</td>
                      <td className="text-right py-2 px-2 font-medium text-green-600">
                        ₹{day.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportGenerator;
