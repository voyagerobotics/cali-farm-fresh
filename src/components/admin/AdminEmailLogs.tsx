import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle, XCircle, RefreshCw, Search, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  email_type: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  related_order_id: string | null;
  related_preorder_id: string | null;
  metadata: any;
  created_at: string;
}

const emailTypeConfig: Record<string, { label: string; color: string }> = {
  order_confirmation_customer: { label: "Order Confirmation", color: "bg-green-500/10 text-green-600" },
  order_confirmation_admin: { label: "Order (Admin)", color: "bg-amber-500/10 text-amber-600" },
  status_update: { label: "Status Update", color: "bg-blue-500/10 text-blue-600" },
  preorder_confirmation_customer: { label: "Pre-Order", color: "bg-purple-500/10 text-purple-600" },
  preorder_confirmation_admin: { label: "Pre-Order (Admin)", color: "bg-violet-500/10 text-violet-600" },
  weekly_reminder: { label: "Weekly Reminder", color: "bg-teal-500/10 text-teal-600" },
  sales_report: { label: "Sales Report", color: "bg-orange-500/10 text-orange-600" },
  critical_error_alert: { label: "Error Alert", color: "bg-red-500/10 text-red-600" },
  preorder_available: { label: "Pre-Order Available", color: "bg-emerald-500/10 text-emerald-600" },
  password_reset_otp: { label: "Password Reset", color: "bg-sky-500/10 text-sky-600" },
};

const AdminEmailLogs = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as unknown as EmailLog[]) || []);
    } catch (err) {
      console.error("Error fetching email logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setIsRefreshing(false);
  };

  const clearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const uniqueTypes = [...new Set(logs.map((l) => l.email_type))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      (log.recipient_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || log.email_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Emails</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          <p className="text-sm text-muted-foreground">Sent Successfully</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-card text-sm"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {emailTypeConfig[type]?.label || type}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {startDate ? format(startDate, "dd MMM yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {endDate ? format(endDate, "dd MMM yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearDates}>
              Clear dates
            </Button>
          )}
        </div>
      </div>

      {/* Email Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No email logs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const typeInfo = emailTypeConfig[log.email_type] || {
              label: log.email_type,
              color: "bg-muted text-muted-foreground",
            };

            return (
              <div
                key={log.id}
                className="bg-card border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        log.status === "sent" ? "bg-green-500/10" : "bg-destructive/10"
                      }`}
                    >
                      {log.status === "sent" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{log.recipient_email}</span>
                        <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{log.subject}</p>
                      {log.recipient_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">To: {log.recipient_name}</p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1">Error: {log.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminEmailLogs;
