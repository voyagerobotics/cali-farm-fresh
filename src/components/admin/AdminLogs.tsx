import { useState, useEffect } from "react";
import { Eye, Users, FileText, MousePointer, TrendingUp, RefreshCw, Activity, ShoppingBag, AlertTriangle, UserPlus, Calendar, Filter, Download, Trash2, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAnalyticsData } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VisitorStats {
  uniqueTodayVisitors: number;
  uniqueVisitorsInRange: number;
  loggedInVisitors: number;
  totalPageViews: number;
  totalProductViews: number;
  errorCount: number;
  addToCartCount: number;
  ordersPlacedCount: number;
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
  user_agent: string | null;
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

interface ErrorLog {
  id: string;
  user_id: string | null;
  session_id: string | null;
  error_message: string;
  error_stack: string | null;
  error_type: string | null;
  page_path: string | null;
  user_agent: string | null;
  additional_context: unknown;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  created_at: string;
}

type DateRange = "today" | "7days" | "30days" | "90days" | "all";

const AdminLogs = () => {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newSignups, setNewSignups] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  
  const { toast } = useToast();
  const analytics = useAdminAnalyticsData();

  const getDateRange = (range: DateRange): { startDate: Date | undefined; endDate: Date } => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate: Date | undefined;
    
    switch (range) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "7days":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "30days":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "90days":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "all":
        startDate = undefined;
        break;
    }
    
    return { startDate, endDate };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      
      const [
        statsData, 
        topProductsData, 
        pageStatsData, 
        visitsData, 
        viewsData, 
        logsData, 
        errorsData,
        usersData,
        signupsCount
      ] = await Promise.all([
        analytics.getVisitorStats(startDate, endDate),
        analytics.getTopViewedProducts(10, startDate, endDate),
        analytics.getPageViewStats(startDate, endDate),
        analytics.fetchPageVisits(startDate, endDate),
        analytics.fetchProductViews(startDate, endDate),
        analytics.fetchActivityLogs(startDate, endDate),
        analytics.fetchErrorLogs(startDate, endDate),
        analytics.fetchUsersWithDetails(),
        analytics.getNewSignups(startDate, endDate),
      ]);

      setStats(statsData);
      setTopProducts(topProductsData);
      setPageStats(pageStatsData);
      setPageVisits(visitsData.data || []);
      setProductViews(viewsData.data as ProductView[] || []);
      setActivityLogs(logsData.data || []);
      setErrorLogs(errorsData.data as ErrorLog[] || []);
      setUsers(usersData.data || []);
      setNewSignups(signupsCount);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

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

  const getDateRangeLabel = (range: DateRange) => {
    switch (range) {
      case "today": return "Today";
      case "7days": return "Last 7 Days";
      case "30days": return "Last 30 Days";
      case "90days": return "Last 90 Days";
      case "all": return "All Time";
    }
  };

  // Export functions
  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = Object.keys(data[0] as object);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header];
          const strValue = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
          return `"${strValue.replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({ title: "Export successful", description: `${filename}.csv downloaded` });
  };

  const exportAllLogs = () => {
    const allData = {
      users,
      pageVisits: pageVisits.slice(0, 1000),
      productViews: productViews.slice(0, 1000),
      activityLogs: activityLogs.slice(0, 1000),
      errorLogs,
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_export_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    
    toast({ title: "Export successful", description: "All analytics data exported as JSON" });
  };

  // Delete functions
  const handleDeleteLogs = async (type: "visits" | "products" | "activity" | "errors" | "all") => {
    setIsDeleting(true);
    const { startDate, endDate } = getDateRange(dateRange);
    
    try {
      if (type === "visits" || type === "all") {
        await analytics.deletePageVisits(startDate, endDate);
      }
      if (type === "products" || type === "all") {
        await analytics.deleteProductViews(startDate, endDate);
      }
      if (type === "activity" || type === "all") {
        await analytics.deleteActivityLogs(startDate, endDate);
      }
      if (type === "errors" || type === "all") {
        await analytics.deleteErrorLogs(startDate, endDate);
      }
      
      toast({ 
        title: "Logs deleted", 
        description: `${type === "all" ? "All logs" : type + " logs"} for ${getDateRangeLabel(dateRange)} deleted successfully` 
      });
      
      fetchData();
    } catch (error) {
      console.error("Error deleting logs:", error);
      toast({ title: "Error deleting logs", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get conversion rate
  const getConversionRate = () => {
    if (!stats || stats.totalProductViews === 0) return "0%";
    const rate = (stats.ordersPlacedCount / stats.totalProductViews) * 100;
    return rate.toFixed(1) + "%";
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
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-semibold">Website Analytics & Logs</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Logs?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all page visits, product views, activity logs, and error logs for {getDateRangeLabel(dateRange)}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteLogs("all")} className="bg-destructive text-destructive-foreground">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Date Range Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Showing data for: <strong>{getDateRangeLabel(dateRange)}</strong></span>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
            <p className="text-2xl font-bold">{stats.uniqueVisitorsInRange}</p>
            <p className="text-sm text-muted-foreground">Unique Visitors</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold">{newSignups}</p>
            <p className="text-sm text-muted-foreground">New Signups</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
              <MousePointer className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{stats.totalPageViews}</p>
            <p className="text-sm text-muted-foreground">Page Views</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold">{stats.totalProductViews}</p>
            <p className="text-sm text-muted-foreground">Product Views</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
              <ShoppingCart className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold">{stats.addToCartCount}</p>
            <p className="text-sm text-muted-foreground">Add to Cart</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold">{stats.ordersPlacedCount}</p>
            <p className="text-sm text-muted-foreground">Orders Placed</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold">{stats.errorCount}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      {stats && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold mb-4">Conversion Funnel</h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{stats.uniqueVisitorsInRange}</div>
              <div className="text-sm text-muted-foreground">Visitors</div>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">→</div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-600">{stats.addToCartCount}</div>
              <div className="text-sm text-muted-foreground">Add to Cart</div>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">→</div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-emerald-600">{stats.ordersPlacedCount}</div>
              <div className="text-sm text-muted-foreground">Orders ({getConversionRate()})</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="errors" className="relative">
            Errors
            {stats && stats.errorCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{stats.errorCount}</span>
            )}
          </TabsTrigger>
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
                <p className="text-muted-foreground text-sm">No product views in this period</p>
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
                <p className="text-muted-foreground text-sm">No page views in this period</p>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">All Registered Users</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{users.length} total users</span>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(users, "users")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No registered users yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">#</th>
                      <th className="text-left py-3 px-2 font-medium">User ID</th>
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Phone</th>
                      <th className="text-left py-3 px-2 font-medium">Address</th>
                      <th className="text-left py-3 px-2 font-medium">City</th>
                      <th className="text-left py-3 px-2 font-medium">Pincode</th>
                      <th className="text-left py-3 px-2 font-medium">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-2">{index + 1}</td>
                        <td className="py-3 px-2">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                            {user.user_id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{user.full_name || <span className="text-muted-foreground italic">Not provided</span>}</td>
                        <td className="py-3 px-2">{user.phone || <span className="text-muted-foreground italic">-</span>}</td>
                        <td className="py-3 px-2 max-w-[200px] truncate">{user.address || <span className="text-muted-foreground italic">-</span>}</td>
                        <td className="py-3 px-2">{user.city || <span className="text-muted-foreground italic">-</span>}</td>
                        <td className="py-3 px-2">{user.pincode || <span className="text-muted-foreground italic">-</span>}</td>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">Page Visits</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{pageVisits.length} visits</span>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(pageVisits, "page_visits")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Page Visits?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all page visit logs for {getDateRangeLabel(dateRange)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteLogs("visits")} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {pageVisits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No page visits in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Page</th>
                      <th className="text-left py-3 px-2 font-medium">Session</th>
                      <th className="text-left py-3 px-2 font-medium">User Type</th>
                      <th className="text-left py-3 px-2 font-medium">Referrer</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageVisits.slice(0, 100).map((visit) => (
                      <tr key={visit.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-2 font-medium">{getPageName(visit.page_path)}</td>
                        <td className="py-3 px-2">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                            {visit.session_id.slice(-8)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {visit.user_id ? (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">Logged In</span>
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs max-w-[150px] truncate">
                          {visit.referrer || "Direct"}
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">Product Views</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{productViews.length} views</span>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(productViews, "product_views")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product Views?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all product view logs for {getDateRangeLabel(dateRange)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteLogs("products")} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {productViews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No product views in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">Product</th>
                      <th className="text-left py-3 px-2 font-medium">Session</th>
                      <th className="text-left py-3 px-2 font-medium">User Type</th>
                      <th className="text-left py-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productViews.slice(0, 100).map((view) => (
                      <tr key={view.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-2 font-medium">{view.products?.name || "Unknown"}</td>
                        <td className="py-3 px-2">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                            {view.session_id.slice(-8)}
                          </span>
                        </td>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">Activity Logs</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{activityLogs.length} activities</span>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(activityLogs, "activity_logs")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Activity Logs?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all activity logs for {getDateRangeLabel(dateRange)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteLogs("activity")} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {activityLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity logs in this period</p>
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
                    {activityLogs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            log.action_type === "add_to_cart" ? "bg-yellow-500/10 text-yellow-600" :
                            log.action_type === "order_placed" ? "bg-emerald-500/10 text-emerald-600" :
                            "bg-primary/10 text-primary"
                          }`}>
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

        {/* Error Logs Tab */}
        <TabsContent value="errors">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-heading font-semibold">Error Logs</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{errorLogs.length} errors</span>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(errorLogs, "error_logs")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Error Logs?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all error logs for {getDateRangeLabel(dateRange)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteLogs("errors")} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {errorLogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No errors in this period! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errorLogs.slice(0, 50).map((error) => (
                  <div key={error.id} className="border border-red-200 bg-red-50/50 dark:bg-red-950/20 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                          {error.error_type || "Error"}
                        </span>
                        {error.user_id && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                            User: {error.user_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(error.created_at)}</span>
                    </div>
                    <p className="font-medium text-red-700 dark:text-red-400 mb-2">{error.error_message}</p>
                    {error.page_path && (
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Page:</strong> {getPageName(error.page_path)}
                      </p>
                    )}
                    {error.session_id && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <strong>Session:</strong> <span className="font-mono">{error.session_id.slice(-12)}</span>
                      </p>
                    )}
                    {error.error_stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {error.error_stack}
                        </pre>
                      </details>
                    )}
                    {error.additional_context && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Additional Context
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(error.additional_context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLogs;
