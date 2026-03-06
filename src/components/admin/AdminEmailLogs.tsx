import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle, XCircle, RefreshCw, Search, CalendarIcon, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

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
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
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
      {/* Stats - clickable to filter */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "bg-card border rounded-xl p-4 text-center transition-all",
            statusFilter === "all" ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
          )}
        >
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Emails</p>
        </button>
        <button
          onClick={() => setStatusFilter("sent")}
          className={cn(
            "bg-card border rounded-xl p-4 text-center transition-all",
            statusFilter === "sent" ? "border-green-500 ring-2 ring-green-500/20" : "border-border hover:border-green-500/40"
          )}
        >
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          <p className="text-sm text-muted-foreground">Sent Successfully</p>
        </button>
        <button
          onClick={() => setStatusFilter("failed")}
          className={cn(
            "bg-card border rounded-xl p-4 text-center transition-all",
            statusFilter === "failed" ? "border-destructive ring-2 ring-destructive/20" : "border-border hover:border-destructive/40"
          )}
        >
          <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          <p className="text-sm text-muted-foreground">Failed</p>
        </button>
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
                onClick={() => setSelectedLog(log)}
                className="bg-card border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors cursor-pointer"
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
                        {log.status === "failed" && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{log.subject}</p>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1 truncate">Error: {log.error_message}</p>
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

      {/* Email Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.status === "sent" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Email Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                <span className="text-muted-foreground font-medium">Status</span>
                <span>
                  {selectedLog.status === "sent" ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">Sent</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </span>

                <span className="text-muted-foreground font-medium">To</span>
                <span className="break-all">
                  {selectedLog.recipient_name && <span className="font-medium">{selectedLog.recipient_name} </span>}
                  &lt;{selectedLog.recipient_email}&gt;
                </span>

                <span className="text-muted-foreground font-medium">Subject</span>
                <span>{selectedLog.subject}</span>

                <span className="text-muted-foreground font-medium">Type</span>
                <span>
                  <Badge variant="outline" className={`text-xs ${emailTypeConfig[selectedLog.email_type]?.color || ""}`}>
                    {emailTypeConfig[selectedLog.email_type]?.label || selectedLog.email_type}
                  </Badge>
                </span>

                <span className="text-muted-foreground font-medium">Sent At</span>
                <span>
                  {new Date(selectedLog.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>

                {selectedLog.resend_id && (
                  <>
                    <span className="text-muted-foreground font-medium">Email ID</span>
                    <span className="font-mono text-xs break-all">{selectedLog.resend_id}</span>
                  </>
                )}

                {selectedLog.related_order_id && (
                  <>
                    <span className="text-muted-foreground font-medium">Order ID</span>
                    <span className="font-mono text-xs break-all">{selectedLog.related_order_id}</span>
                  </>
                )}

                {selectedLog.related_preorder_id && (
                  <>
                    <span className="text-muted-foreground font-medium">Pre-Order ID</span>
                    <span className="font-mono text-xs break-all">{selectedLog.related_preorder_id}</span>
                  </>
                )}
              </div>

              {selectedLog.error_message && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Error Message</p>
                  <p className="text-sm text-destructive/80 break-all">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Metadata</p>
                  <div className="space-y-1">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailLogs;