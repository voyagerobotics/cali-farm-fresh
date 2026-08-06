import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BotSettings = {
  id: string;
  business_name: string;
  business_logo_url: string | null;
  business_description: string | null;
  business_address: string | null;
  business_phones: string[];
  business_email: string | null;
  business_website: string | null;
  business_hours: string | null;
  support_number: string | null;
  social_links: Record<string, string>;
  greeting_message: string | null;
  away_message: string | null;
  working_hours_message: string | null;
  ai_personality: string | null;
  ai_tone: string | null;
  ai_greeting_style: string | null;
  default_language: string;
  fallback_message: string | null;
  recommendation_rules: string | null;
  upsell_rules: string | null;
  cross_sell_rules: string | null;
  notify_new_order: boolean;
  notify_new_customer: boolean;
  notify_payment_received: boolean;
  notify_payment_failed: boolean;
  notify_low_stock: boolean;
  notify_cancelled_order: boolean;
  notify_abandoned_cart: boolean;
  theme: string;
  primary_color: string;
  accent_color: string;
  button_style: string;
  font_family: string;
  emoji_style: string;
  date_format: string;
  currency: string;
  timezone: string;
};

export type BotContent = {
  id: string;
  welcome_text: string;
  welcome_greeting: string;
  banner_image_url: string | null;
  quick_replies: string[];
  suggested_questions: string[];
  festival_greetings: { name: string; message: string }[];
  seasonal_greetings: { name: string; message: string }[];
};

export const useBotSettings = () => {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_bot_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) {
      toast({ title: "Could not load bot settings", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings({
        ...(data as any),
        business_phones: (data as any).business_phones ?? [],
        social_links: ((data as any).social_links ?? {}) as Record<string, string>,
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (updates: Partial<BotSettings>) => {
    setIsSaving(true);
    const { error } = await supabase
      .from("whatsapp_bot_settings")
      .update(updates as any)
      .eq("id", "default");
    setIsSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return false;
    }
    setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
    toast({ title: "Saved", description: "The bot picks this up on the next message." });
    return true;
  };

  return { settings, setSettings, isLoading, isSaving, save, reload: load };
};

export const useBotContent = () => {
  const [content, setContent] = useState<BotContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_bot_content")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (error) {
      toast({ title: "Could not load bot content", description: error.message, variant: "destructive" });
    } else if (data) {
      const d = data as any;
      setContent({
        ...d,
        quick_replies: Array.isArray(d.quick_replies) ? d.quick_replies : [],
        suggested_questions: Array.isArray(d.suggested_questions) ? d.suggested_questions : [],
        festival_greetings: Array.isArray(d.festival_greetings) ? d.festival_greetings : [],
        seasonal_greetings: Array.isArray(d.seasonal_greetings) ? d.seasonal_greetings : [],
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (updates: Partial<BotContent>) => {
    setIsSaving(true);
    const { error } = await supabase
      .from("whatsapp_bot_content")
      .update(updates as any)
      .eq("id", "default");
    setIsSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return false;
    }
    setContent((prev) => (prev ? { ...prev, ...updates } : prev));
    toast({ title: "Saved", description: "Welcome content updated." });
    return true;
  };

  return { content, setContent, isLoading, isSaving, save, reload: load };
};
