import { useState, useEffect, useRef } from "react";
import { Bell, X, ShoppingCart, AlertTriangle, Trash2 } from "lucide-react";
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
type FilterType = "all" | "orders" | "stock";

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not supported");
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user, isAdmin } = useAuth();
  const isInitialLoad = useRef(true);

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

        // Fetch order notifications (for admins)
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
      isInitialLoad.current = false;
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

            if (soundEnabled && !isInitialLoad.current) {
              playNotificationSound();
            }

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

            if (soundEnabled && !isInitialLoad.current) {
              playNotificationSound();
            }

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
  }, [user, isAdmin, soundEnabled]);

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

  const deleteNotification = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (notification.type === "stock") {
      await supabase.from("stock_notifications").delete().eq("id", notification.id);
    } else {
      await (supabase as any).from("order_notifications").delete().eq("id", notification.id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
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

  const clearAllNotifications = async () => {
    const stockIds = notifications.filter((n) => n.type === "stock").map((n) => n.id);
    const orderIds = notifications.filter((n) => n.type === "order").map((n) => n.id);

    if (stockIds.length > 0) {
      await supabase.from("stock_notifications").delete().in("id", stockIds);
    }
    if (orderIds.length > 0) {
      await (supabase as any).from("order_notifications").delete().in("id", orderIds);
    }

    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "orders") return n.type === "order";
    if (filter === "stock") return n.type === "stock";
    return true;
  });

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
          <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-elevated z-50 max-h-[28rem] overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      title="Clear all"
                    >
                      Clear all
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1">
                {(["all", "orders", "stock"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f === "orders" ? "Orders" : "Stock"}
                  </button>
                ))}
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Sound notifications</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    soundEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      soundEnabled ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-64">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={`${notification.type}-${notification.id}`}
                    onClick={() => !notification.is_read && markAsRead(notification)}
                    className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors group ${
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
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <button
                          onClick={(e) => deleteNotification(e, notification)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
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
