import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrendData {
  date: string;
  visitors: number;
  orders: number;
  revenue: number;
}

interface AnalyticsTrendChartsProps {
  dateRange: "7days" | "30days" | "90days";
}

const AnalyticsTrendCharts = ({ dateRange }: AnalyticsTrendChartsProps) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      
      const daysCount = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);
      startDate.setHours(0, 0, 0, 0);

      try {
        // Fetch page visits for visitors
        const { data: visits } = await supabase
          .from("page_visits")
          .select("session_id, created_at")
          .gte("created_at", startDate.toISOString());

        // Fetch orders for orders count and revenue
        const { data: orders } = await supabase
          .from("orders")
          .select("created_at, total")
          .gte("created_at", startDate.toISOString());

        // Group by date
        const dataByDate: Record<string, { sessions: Set<string>; orders: number; revenue: number }> = {};

        // Initialize all dates in range
        for (let i = 0; i < daysCount; i++) {
          const date = new Date();
          date.setDate(date.getDate() - daysCount + i + 1);
          const dateStr = date.toISOString().split("T")[0];
          dataByDate[dateStr] = { sessions: new Set(), orders: 0, revenue: 0 };
        }

        // Process visits
        visits?.forEach((visit) => {
          const dateStr = visit.created_at.split("T")[0];
          if (dataByDate[dateStr]) {
            dataByDate[dateStr].sessions.add(visit.session_id);
          }
        });

        // Process orders
        orders?.forEach((order) => {
          const dateStr = order.created_at.split("T")[0];
          if (dataByDate[dateStr]) {
            dataByDate[dateStr].orders++;
            dataByDate[dateStr].revenue += order.total || 0;
          }
        });

        // Convert to array
        const chartData = Object.entries(dataByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString("en-IN", { 
              month: "short", 
              day: "numeric" 
            }),
            visitors: data.sessions.size,
            orders: data.orders,
            revenue: Math.round(data.revenue),
          }));

        setTrendData(chartData);
      } catch (error) {
        console.error("Error fetching trend data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 h-[350px] animate-pulse" />
        <div className="bg-card border border-border rounded-xl p-6 h-[350px] animate-pulse" />
      </div>
    );
  }

  const totalVisitors = trendData.reduce((sum, d) => sum + d.visitors, 0);
  const totalOrders = trendData.reduce((sum, d) => sum + d.orders, 0);
  const totalRevenue = trendData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalVisitors.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Visitors</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalOrders}</p>
          <p className="text-sm text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visitors Trend */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-heading font-semibold">Daily Visitors</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders & Revenue Trend */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="font-heading font-semibold">Orders & Revenue</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  yAxisId="left"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value, name) => [
                    name === "revenue" ? `₹${value}` : value,
                    name === "revenue" ? "Revenue" : "Orders"
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#10b981" name="Orders" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" fill="#f59e0b" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTrendCharts;
