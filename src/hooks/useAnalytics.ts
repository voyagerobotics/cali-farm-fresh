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
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!productId || hasTracked.current) return;
    hasTracked.current = true;

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

// Track add to cart events
export const useCartTracking = () => {
  const { user } = useAuth();

  const trackAddToCart = useCallback(async (
    productId: string,
    productName: string,
    price: number,
    quantity: number = 1,
    variantName?: string
  ) => {
    try {
      await supabase.from("user_activity_logs").insert([{
        user_id: user?.id || null,
        action_type: "add_to_cart",
        action_details: JSON.parse(JSON.stringify({
          product_id: productId,
          product_name: productName,
          price,
          quantity,
          variant_name: variantName,
          session_id: getSessionId(),
        })),
        page_path: window.location.pathname,
      }]);
    } catch (error) {
      console.error("Error tracking add to cart:", error);
    }
  }, [user]);

  return { trackAddToCart };
};

// Track order placed events
export const useOrderTracking = () => {
  const { user } = useAuth();

  const trackOrderPlaced = useCallback(async (
    orderNumber: string,
    orderTotal: number,
    itemCount: number,
    paymentMethod: string
  ) => {
    try {
      await supabase.from("user_activity_logs").insert([{
        user_id: user?.id || null,
        action_type: "order_placed",
        action_details: JSON.parse(JSON.stringify({
          order_number: orderNumber,
          order_total: orderTotal,
          item_count: itemCount,
          payment_method: paymentMethod,
          session_id: getSessionId(),
        })),
        page_path: "/checkout",
      }]);
    } catch (error) {
      console.error("Error tracking order placed:", error);
    }
  }, [user]);

  return { trackOrderPlaced };
};

// Error logging hook with email alerts for critical errors
export const useErrorLogger = () => {
  const { user } = useAuth();

  const logError = useCallback(async (
    error: Error | string,
    errorType?: string,
    additionalContext?: Record<string, unknown>,
    sendEmailAlert: boolean = true
  ) => {
    try {
      const errorMessage = typeof error === "string" ? error : error.message;
      const errorStack = typeof error === "object" ? error.stack : undefined;

      // Log to database
      await supabase.from("error_logs").insert([{
        user_id: user?.id || null,
        session_id: getSessionId(),
        error_message: errorMessage,
        error_stack: errorStack,
        error_type: errorType || "runtime_error",
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
        additional_context: additionalContext ? JSON.parse(JSON.stringify(additionalContext)) : null,
      }]);

      // Send email alert for critical errors
      if (sendEmailAlert) {
        try {
          await supabase.functions.invoke("send-critical-error-alert", {
            body: {
              error_message: errorMessage,
              error_type: errorType || "runtime_error",
              error_stack: errorStack,
              page_path: window.location.pathname,
              user_id: user?.id,
              session_id: getSessionId(),
              additional_context: additionalContext,
            },
          });
        } catch (emailError) {
          console.error("Failed to send error alert email:", emailError);
        }
      }
    } catch (logError) {
      console.error("Error logging error:", logError);
    }
  }, [user]);

  return { logError };
};

// Hook for admin to fetch analytics data with date filtering
export const useAdminAnalyticsData = () => {
  const fetchPageVisits = async (startDate?: Date, endDate?: Date, limit = 500) => {
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

    const { data, error } = await query.limit(limit);
    return { data, error };
  };

  const fetchProductViews = async (startDate?: Date, endDate?: Date, limit = 500) => {
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

    const { data, error } = await query.limit(limit);
    return { data, error };
  };

  const fetchActivityLogs = async (startDate?: Date, endDate?: Date, limit = 500) => {
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

    const { data, error } = await query.limit(limit);
    return { data, error };
  };

  const fetchErrorLogs = async (startDate?: Date, endDate?: Date, limit = 100) => {
    let query = supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query.limit(limit);
    return { data, error };
  };

  const fetchUsersWithDetails = async () => {
    // Fetch profiles with user details - admin RLS policy allows viewing all
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, address, city, pincode, created_at")
      .order("created_at", { ascending: false });

    return { data: profiles, error };
  };

  const getVisitorStats = async (startDate?: Date, endDate?: Date) => {
    // Get unique visitors (by session) today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayQuery = supabase
      .from("page_visits")
      .select("session_id")
      .gte("created_at", today.toISOString());

    const { data: todayVisits } = await todayQuery;
    const uniqueTodayVisitors = new Set(todayVisits?.map(v => v.session_id)).size;

    // Get visitors in date range
    let rangeQuery = supabase.from("page_visits").select("session_id, user_id");
    if (startDate) {
      rangeQuery = rangeQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      rangeQuery = rangeQuery.lte("created_at", endDate.toISOString());
    }

    const { data: rangeVisits } = await rangeQuery;
    const uniqueVisitorsInRange = new Set(rangeVisits?.map(v => v.session_id)).size;
    const loggedInVisitors = new Set(rangeVisits?.filter(v => v.user_id).map(v => v.user_id)).size;

    // Get total page views in range
    let pageViewQuery = supabase
      .from("page_visits")
      .select("*", { count: "exact", head: true });
    if (startDate) {
      pageViewQuery = pageViewQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      pageViewQuery = pageViewQuery.lte("created_at", endDate.toISOString());
    }
    const { count: totalPageViews } = await pageViewQuery;

    // Get total product views in range
    let productViewQuery = supabase
      .from("product_views")
      .select("*", { count: "exact", head: true });
    if (startDate) {
      productViewQuery = productViewQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      productViewQuery = productViewQuery.lte("created_at", endDate.toISOString());
    }
    const { count: totalProductViews } = await productViewQuery;

    // Get error count
    let errorQuery = supabase
      .from("error_logs")
      .select("*", { count: "exact", head: true });
    if (startDate) {
      errorQuery = errorQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      errorQuery = errorQuery.lte("created_at", endDate.toISOString());
    }
    const { count: errorCount } = await errorQuery;

    // Get conversion stats - add to cart and orders
    let addToCartQuery = supabase
      .from("user_activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action_type", "add_to_cart");
    if (startDate) {
      addToCartQuery = addToCartQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      addToCartQuery = addToCartQuery.lte("created_at", endDate.toISOString());
    }
    const { count: addToCartCount } = await addToCartQuery;

    let ordersQuery = supabase
      .from("user_activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action_type", "order_placed");
    if (startDate) {
      ordersQuery = ordersQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      ordersQuery = ordersQuery.lte("created_at", endDate.toISOString());
    }
    const { count: ordersPlacedCount } = await ordersQuery;

    return {
      uniqueTodayVisitors,
      uniqueVisitorsInRange,
      loggedInVisitors,
      totalPageViews: totalPageViews || 0,
      totalProductViews: totalProductViews || 0,
      errorCount: errorCount || 0,
      addToCartCount: addToCartCount || 0,
      ordersPlacedCount: ordersPlacedCount || 0,
    };
  };

  const getTopViewedProducts = async (limit = 10, startDate?: Date, endDate?: Date) => {
    let query = supabase
      .from("product_views")
      .select("product_id, products(name)");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data } = await query;

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

  const getPageViewStats = async (startDate?: Date, endDate?: Date) => {
    let query = supabase.from("page_visits").select("page_path");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data } = await query;

    if (!data) return [];

    const pageCounts: Record<string, number> = {};
    data.forEach((visit) => {
      pageCounts[visit.page_path] = (pageCounts[visit.page_path] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .map(([path, count]) => ({ page_path: path, view_count: count }))
      .sort((a, b) => b.view_count - a.view_count);
  };

  const getNewSignups = async (startDate?: Date, endDate?: Date) => {
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { count } = await query;
    return count || 0;
  };

  // Delete functions for logs
  const deletePageVisits = async (startDate?: Date, endDate?: Date) => {
    let query = supabase.from("page_visits").delete();
    
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    
    // Need a WHERE clause for delete
    const { error } = await query.neq("id", "00000000-0000-0000-0000-000000000000");
    return { error };
  };

  const deleteProductViews = async (startDate?: Date, endDate?: Date) => {
    let query = supabase.from("product_views").delete();
    
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    
    const { error } = await query.neq("id", "00000000-0000-0000-0000-000000000000");
    return { error };
  };

  const deleteActivityLogs = async (startDate?: Date, endDate?: Date) => {
    let query = supabase.from("user_activity_logs").delete();
    
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    
    const { error } = await query.neq("id", "00000000-0000-0000-0000-000000000000");
    return { error };
  };

  const deleteErrorLogs = async (startDate?: Date, endDate?: Date) => {
    let query = supabase.from("error_logs").delete();
    
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }
    
    const { error } = await query.neq("id", "00000000-0000-0000-0000-000000000000");
    return { error };
  };

  return {
    fetchPageVisits,
    fetchProductViews,
    fetchActivityLogs,
    fetchErrorLogs,
    fetchUsersWithDetails,
    getVisitorStats,
    getTopViewedProducts,
    getPageViewStats,
    getNewSignups,
    deletePageVisits,
    deleteProductViews,
    deleteActivityLogs,
    deleteErrorLogs,
  };
};
