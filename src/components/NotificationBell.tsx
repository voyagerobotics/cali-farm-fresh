import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  product_id: string;
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("stock_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("stock-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setLatestNotification(newNotification);
          setShowPopup(true);

          // Auto-hide popup after 5 seconds
          setTimeout(() => {
            setShowPopup(false);
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup Notification */}
      {showPopup && latestNotification && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-elevated p-4 animate-fade-in z-50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Stock Update!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {latestNotification.message}
              </p>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-elevated z-50 max-h-96 overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-medium text-foreground">Notifications</h3>
            </div>

            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-border last:border-0 ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="text-sm text-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
