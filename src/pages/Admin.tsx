import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingBag, BarChart3, LogOut, ArrowLeft, FolderTree, Settings, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminVerification } from "@/hooks/useAdminVerification";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminLogs from "@/components/admin/AdminLogs";

type TabType = "analytics" | "orders" | "products" | "categories" | "settings" | "logs";

const Admin = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  // Server-side admin role verification for defense-in-depth
  const { isVerified, isVerifying } = useAdminVerification();
  const [activeTab, setActiveTab] = useState<TabType>("analytics");

  // Show loading while verifying admin role server-side
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render admin content if not verified
  if (!isVerified) {
    return null;
  }

  const tabs = [
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "orders" as const, label: "Orders", icon: ShoppingBag },
    { id: "products" as const, label: "Products", icon: Package },
    { id: "categories" as const, label: "Categories", icon: FolderTree },
    { id: "logs" as const, label: "Logs", icon: Activity },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">California Farms India</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === "analytics" && <AdminAnalytics />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "products" && <AdminProducts />}
        {activeTab === "categories" && <AdminCategories />}
        {activeTab === "logs" && <AdminLogs />}
        {activeTab === "settings" && <AdminSettings />}
      </div>
    </div>
  );
};

export default Admin;
