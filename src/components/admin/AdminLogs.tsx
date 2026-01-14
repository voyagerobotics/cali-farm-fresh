import { useState, useEffect } from "react";
import { Eye, Users, FileText, MousePointer, TrendingUp, Calendar, RefreshCw, Activity, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAnalyticsData } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";

interface VisitorStats {
  uniqueTodayVisitors: number;
  totalUniqueVisitors: number;
  totalPageViews: number;
  totalProductViews: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  view_count: number;
}

interface PageStat {
  page_path: string;
  view_count: number;
}

interface PageVisit {
  id: string;
  session_id: string;
  page_path: string;
  user_id: string | null;
  created_at: string;
  referrer: string | null;
}

interface ProductView {
  id: string;
  product_id: string;
  user_id: string | null;
  session_id: string;
  created_at: string;
  products: { name: string } | null;
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  action_details: unknown;
  page_path: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

const AdminLogs = () => {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const analytics = useAdminAnalyticsData();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsData, topProductsData, pageStatsData, visitsData, viewsData, logsData, usersData] = await Promise.all([
        analytics.getVisitorStats(),
        analytics.getTopViewedProducts(10),
        analytics.getPageViewStats(),
        analytics.fetchPageVisits(),
        analytics.fetchProductViews(),
        analytics.fetchActivityLogs(),
        supabase.from("profiles").select("id, user_id, full_name, phone, created_at").order("created_at", { ascending: false }),
      ]);

      setStats(statsData);
      setTopProducts(topProductsData);
      setPageStats(pageStatsData);
      setPageVisits(visitsData.data || []);
      setProductViews(viewsData.data as ProductView[] || []);
      setActivityLogs(logsData.data || []);
      setUsers(usersData.data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const getPageName = (path: string) => {
    const names: Record<string, string> = {
      "/": "Home",
      "/auth": "Login/Signup",
      "/checkout": "Checkout",
      "/orders": "My Orders",
      "/admin": "Admin Dashboard",
      "/terms-and-conditions": "Terms & Conditions",
      "/refund-policy": "Refund Policy",
    };
    if (path.startsWith("/product/")) return "Product Detail";
    if (path.startsWith("/orders/")) return "Order Detail";
    return names[path] || path;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Website Analytics & Logs</h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{stats.uniqueTodayVisitors}</p>
            <p className="text-sm text-muted-foreground">Visitors Today</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{stats.totalUniqueVisitors}</p>
            <p className="text-sm text-muted-foreground">Total Unique Visitors</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <MousePointer className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{stats.totalPageViews}</p>
            <p className="text-sm text-muted-foreground">Total Page Views</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold">{stats.totalProductViews}</p>
            <p className="text-sm text-muted-foreground">Product Views</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="visits">Page Visits</TabsTrigger>
          <TabsTrigger value="products">Product Views</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Viewed Products */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">Top Viewed Products</h3>
              </div>
              {topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No product views yet</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium">{product.product_name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{product.view_count} views</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Page Views */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">Page Views by Page</h3>
              </div>
              {pageStats.length === 0 ? (
                <p className="text-muted-foreground text-sm">No page views yet</p>
              ) : (
                <div className="space-y-3">
                  {pageStats.slice(0, 10).map((page) => (
                    <div key={page.page_path} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="font-medium">{getPageName(page.page_path)}</span>
                      <span className="text-sm text-muted-foreground">{page.view_count} views</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Registered Users</h3>
            </div>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No registered users yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">#</th>
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Phone</th>
                      <th className="text-left py-3 px-2 font-medium">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2 font-medium">{user.full_name || "Not provided"}</td>
                        <td className="py-3 px-2">{user.phone || "Not provided"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Page Visits Tab */}
        <TabsContent value="visits">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MousePointer className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Recent Page Visits</h3>
            </div>
            {pageVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No page visits yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Page</th>
                      <th className="text-left py-3 px-2 font-medium">Session</th>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageVisits.slice(0, 50).map((visit) => (
                      <tr key={visit.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2 font-medium">{getPageName(visit.page_path)}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground font-mono">{visit.session_id.slice(-8)}</td>
                        <td className="py-3 px-2">
                          {visit.user_id ? (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">Logged In</span>
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(visit.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Product Views Tab */}
        <TabsContent value="products">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Recent Product Views</h3>
            </div>
            {productViews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No product views yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Product</th>
                      <th className="text-left py-3 px-2 font-medium">Session</th>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productViews.slice(0, 50).map((view) => (
                      <tr key={view.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2 font-medium">{view.products?.name || "Unknown"}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground font-mono">{view.session_id.slice(-8)}</td>
                        <td className="py-3 px-2">
                          {view.user_id ? (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">Logged In</span>
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(view.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Activity Logs</h3>
            </div>
            {activityLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity logs yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Action</th>
                      <th className="text-left py-3 px-2 font-medium">Details</th>
                      <th className="text-left py-3 px-2 font-medium">Page</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                            {log.action_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">
                          {log.action_details ? JSON.stringify(log.action_details) : "-"}
                        </td>
                        <td className="py-3 px-2">{log.page_path ? getPageName(log.page_path) : "-"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLogs;
