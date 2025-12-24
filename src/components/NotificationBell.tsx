import { useState, useEffect } from "react";
import { Bell, X, ShoppingCart, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StockNotification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  product_id: string;
  type: "stock";
}

interface OrderNotification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  order_id: string;
  notification_type: string;
  type: "order";
}

type Notification = StockNotification | OrderNotification;

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      const allNotifications: Notification[] = [];

      // Fetch stock notifications (for admins)
      if (isAdmin) {
        const { data: stockData } = await supabase
          .from("stock_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (stockData) {
          allNotifications.push(
            ...stockData.map((n) => ({ ...n, type: "stock" as const }))
          );
        }

        // Fetch order notifications (for admins) - using type assertion since table is new
        const { data: orderData } = await (supabase as any)
          .from("order_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (orderData) {
          allNotifications.push(
            ...orderData.map((n: any) => ({ 
              ...n, 
              type: "order" as const 
            }))
          );
        }
      }

      // Sort by created_at descending
      allNotifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications.slice(0, 20));
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (isAdmin) {
      // Stock notifications channel
      const stockChannel = supabase
        .channel("stock-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "stock_notifications",
          },
          (payload) => {
            const newNotification = { ...payload.new, type: "stock" } as StockNotification;
            setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
            setLatestNotification(newNotification);
            setShowPopup(true);

            setTimeout(() => {
              setShowPopup(false);
            }, 5000);
          }
        )
        .subscribe();

      channels.push(stockChannel);

      // Order notifications channel
      const orderChannel = supabase
        .channel("order-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "order_notifications",
          },
          (payload) => {
            const newNotification = { ...payload.new, type: "order" } as OrderNotification;
            setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
            setLatestNotification(newNotification);
            setShowPopup(true);

            setTimeout(() => {
              setShowPopup(false);
            }, 5000);
          }
        )
        .subscribe();

      channels.push(orderChannel);
    }

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [user, isAdmin]);

  const markAsRead = async (notification: Notification) => {
    if (notification.type === "stock") {
      await supabase.from("stock_notifications").update({ is_read: true }).eq("id", notification.id);
    } else {
      await (supabase as any).from("order_notifications").update({ is_read: true }).eq("id", notification.id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const stockIds = notifications.filter((n) => n.type === "stock" && !n.is_read).map((n) => n.id);
    const orderIds = notifications.filter((n) => n.type === "order" && !n.is_read).map((n) => n.id);

    if (stockIds.length > 0) {
      await supabase.from("stock_notifications").update({ is_read: true }).in("id", stockIds);
    }
    if (orderIds.length > 0) {
      await (supabase as any).from("order_notifications").update({ is_read: true }).in("id", orderIds);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

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

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === "stock") {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    return <ShoppingCart className="w-4 h-4 text-primary" />;
  };

  const getPopupTitle = (notification: Notification) => {
    if (notification.type === "stock") return "Low Stock Alert!";
    return "New Order!";
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup Notification */}
      {showPopup && latestNotification && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-elevated p-4 animate-fade-in z-50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">{getNotificationIcon(latestNotification)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {getPopupTitle(latestNotification)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {latestNotification.message}
                </p>
              </div>
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
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={`${notification.type}-${notification.id}`}
                    onClick={() => !notification.is_read && markAsRead(notification)}
                    className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getNotificationIcon(notification)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
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
