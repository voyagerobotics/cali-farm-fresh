import { useState } from "react";
import { MessageSquare, FileText, Activity, BellOff } from "lucide-react";
import AdminWhatsAppPreview from "@/components/admin/AdminWhatsAppPreview";
import AdminWhatsAppTemplates from "@/components/admin/AdminWhatsAppTemplates";
import AdminWhatsAppActivity from "@/components/admin/AdminWhatsAppActivity";
import AdminWhatsAppOptOuts from "@/components/admin/AdminWhatsAppOptOuts";

type SubTab = "preview" | "templates" | "activity" | "optouts";

const subTabs: { id: SubTab; label: string; icon: any }[] = [
  { id: "preview", label: "Preview & test", icon: MessageSquare },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "activity", label: "Activity log", icon: Activity },
  { id: "optouts", label: "Opt-outs", icon: BellOff },
];

const AdminWhatsApp = () => {
  const [tab, setTab] = useState<SubTab>("preview");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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

      {tab === "preview" && <AdminWhatsAppPreview />}
      {tab === "templates" && <AdminWhatsAppTemplates />}
      {tab === "activity" && <AdminWhatsAppActivity />}
      {tab === "optouts" && <AdminWhatsAppOptOuts />}
    </div>
  );
};

export default AdminWhatsApp;
