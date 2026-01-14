import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

export const usePageTracking = () => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const trackPageVisit = async () => {
      try {
        await supabase.from("page_visits").insert({
          user_id: user?.id || null,
          session_id: getSessionId(),
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error("Error tracking page visit:", error);
      }
    };

    trackPageVisit();
  }, [user]);
};

export const useProductViewTracking = (productId: string | undefined) => {
  const { user } = useAuth();
  const startTime = useRef<number>(Date.now());
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!productId || hasTracked.current) return;
    hasTracked.current = true;
    startTime.current = Date.now();

    const trackProductView = async () => {
      try {
        await supabase.from("product_views").insert({
          product_id: productId,
          user_id: user?.id || null,
          session_id: getSessionId(),
        });
      } catch (error) {
        console.error("Error tracking product view:", error);
      }
    };

    trackProductView();

    // Reset when product changes
    return () => {
      hasTracked.current = false;
    };
  }, [productId, user]);
};

export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    actionType: string,
    actionDetails?: Record<string, unknown>,
    pagePath?: string
  ) => {
    try {
      await supabase.from("user_activity_logs").insert([{
        user_id: user?.id || null,
        action_type: actionType,
        action_details: actionDetails ? JSON.parse(JSON.stringify(actionDetails)) : null,
        page_path: pagePath || window.location.pathname,
      }]);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }, [user]);

  return { logActivity };
};

// Hook for admin to fetch analytics data
export const useAdminAnalyticsData = () => {
  const fetchPageVisits = async (startDate?: Date, endDate?: Date) => {
    let query = supabase
      .from("page_visits")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query.limit(500);
    return { data, error };
  };

  const fetchProductViews = async (startDate?: Date, endDate?: Date) => {
    let query = supabase
      .from("product_views")
      .select("*, products(name)")
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query.limit(500);
    return { data, error };
  };

  const fetchActivityLogs = async (startDate?: Date, endDate?: Date) => {
    let query = supabase
      .from("user_activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query.limit(500);
    return { data, error };
  };

  const getVisitorStats = async () => {
    // Get unique visitors (by session) today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayVisits } = await supabase
      .from("page_visits")
      .select("session_id")
      .gte("created_at", today.toISOString());

    const uniqueTodayVisitors = new Set(todayVisits?.map(v => v.session_id)).size;

    // Get total unique visitors
    const { data: allVisits } = await supabase
      .from("page_visits")
      .select("session_id");

    const totalUniqueVisitors = new Set(allVisits?.map(v => v.session_id)).size;

    // Get total page views
    const { count: totalPageViews } = await supabase
      .from("page_visits")
      .select("*", { count: "exact", head: true });

    // Get total product views
    const { count: totalProductViews } = await supabase
      .from("product_views")
      .select("*", { count: "exact", head: true });

    return {
      uniqueTodayVisitors,
      totalUniqueVisitors,
      totalPageViews: totalPageViews || 0,
      totalProductViews: totalProductViews || 0,
    };
  };

  const getTopViewedProducts = async (limit = 10) => {
    const { data } = await supabase
      .from("product_views")
      .select("product_id, products(name)");

    if (!data) return [];

    const productCounts: Record<string, { count: number; name: string }> = {};
    data.forEach((view: { product_id: string; products: { name: string } | null }) => {
      if (!productCounts[view.product_id]) {
        productCounts[view.product_id] = {
          count: 0,
          name: view.products?.name || "Unknown",
        };
      }
      productCounts[view.product_id].count++;
    });

    return Object.entries(productCounts)
      .map(([id, { count, name }]) => ({ product_id: id, product_name: name, view_count: count }))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, limit);
  };

  const getPageViewStats = async () => {
    const { data } = await supabase
      .from("page_visits")
      .select("page_path");

    if (!data) return [];

    const pageCounts: Record<string, number> = {};
    data.forEach((visit) => {
      pageCounts[visit.page_path] = (pageCounts[visit.page_path] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .map(([path, count]) => ({ page_path: path, view_count: count }))
      .sort((a, b) => b.view_count - a.view_count);
  };

  return {
    fetchPageVisits,
    fetchProductViews,
    fetchActivityLogs,
    getVisitorStats,
    getTopViewedProducts,
    getPageViewStats,
  };
};
