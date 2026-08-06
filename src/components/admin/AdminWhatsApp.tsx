import { useState } from "react";
import {
  MessageSquare, FileText, Activity, BellOff, LayoutDashboard,
  Store, Sparkles, ListTree, Bot, RefreshCw, Users, Inbox, Megaphone, Truck,
} from "lucide-react";
import AdminWhatsAppPreview from "@/components/admin/AdminWhatsAppPreview";
import AdminWhatsAppTemplates from "@/components/admin/AdminWhatsAppTemplates";
import AdminWhatsAppActivity from "@/components/admin/AdminWhatsAppActivity";
import AdminWhatsAppOptOuts from "@/components/admin/AdminWhatsAppOptOuts";
import BotDashboard from "@/components/admin/whatsapp/BotDashboard";
import BotBusinessProfile from "@/components/admin/whatsapp/BotBusinessProfile";
import BotWelcome from "@/components/admin/whatsapp/BotWelcome";
import BotMenuBuilder from "@/components/admin/whatsapp/BotMenuBuilder";
import BotAIConfig from "@/components/admin/whatsapp/BotAIConfig";
import BotProductSync from "@/components/admin/whatsapp/BotProductSync";
import BotCustomers from "@/components/admin/whatsapp/BotCustomers";
import BotInbox from "@/components/admin/whatsapp/BotInbox";
import BotBroadcast from "@/components/admin/whatsapp/BotBroadcast";
import BotDeliveryZones from "@/components/admin/whatsapp/BotDeliveryZones";

type SubTab =
  | "dashboard" | "profile" | "welcome" | "menu" | "ai" | "sync"
  | "customers" | "inbox" | "broadcast" | "delivery"
  | "preview" | "templates" | "activity" | "optouts";

const subTabs: { id: SubTab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inbox", label: "Conversations", icon: Inbox },
  { id: "customers", label: "Customers", icon: Users },
  { id: "broadcast", label: "Broadcasts", icon: Megaphone },
  { id: "delivery", label: "Delivery zones", icon: Truck },
  { id: "sync", label: "Product sync", icon: RefreshCw },
  { id: "profile", label: "Business profile", icon: Store },
  { id: "welcome", label: "Welcome & replies", icon: Sparkles },
  { id: "menu", label: "Menu builder", icon: ListTree },
  { id: "ai", label: "AI & knowledge", icon: Bot },
  { id: "preview", label: "Preview & test", icon: MessageSquare },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "activity", label: "Activity log", icon: Activity },
  { id: "optouts", label: "Opt-outs", icon: BellOff },
];

const AdminWhatsApp = () => {
  const [tab, setTab] = useState<SubTab>("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-border overflow-x-auto">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <BotDashboard />}
      {tab === "inbox" && <BotInbox />}
      {tab === "customers" && <BotCustomers />}
      {tab === "broadcast" && <BotBroadcast />}
      {tab === "delivery" && <BotDeliveryZones />}
      {tab === "sync" && <BotProductSync />}
      {tab === "profile" && <BotBusinessProfile />}
      {tab === "welcome" && <BotWelcome />}
      {tab === "menu" && <BotMenuBuilder />}
      {tab === "ai" && <BotAIConfig />}
      {tab === "preview" && <AdminWhatsAppPreview />}
      {tab === "templates" && <AdminWhatsAppTemplates />}
      {tab === "activity" && <AdminWhatsAppActivity />}
      {tab === "optouts" && <AdminWhatsAppOptOuts />}
    </div>
  );
};

export default AdminWhatsApp;
