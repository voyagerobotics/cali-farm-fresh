export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      delivery_zones: {
        Row: {
          created_at: string
          delivery_charge: number
          id: string
          is_active: boolean
          max_distance_km: number
          min_distance_km: number
          zone_name: string
        }
        Insert: {
          created_at?: string
          delivery_charge: number
          id?: string
          is_active?: boolean
          max_distance_km: number
          min_distance_km?: number
          zone_name: string
        }
        Update: {
          created_at?: string
          delivery_charge?: number
          id?: string
          is_active?: boolean
          max_distance_km?: number
          min_distance_km?: number
          zone_name?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_otp_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: string
          delivery_charge: number | null
          delivery_name: string
          delivery_phone: string
          delivery_slot: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_screenshot_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_verified_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          upi_reference: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_address: string
          delivery_charge?: number | null
          delivery_name: string
          delivery_phone: string
          delivery_slot?: string | null
          id?: string
          notes?: string | null
          order_date: string
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_verified_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_address?: string
          delivery_charge?: number | null
          delivery_name?: string
          delivery_phone?: string
          delivery_slot?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_screenshot_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_verified_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_available: boolean | null
          is_hidden: boolean | null
          name: string
          price: number
          stock_quantity: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          is_hidden?: boolean | null
          name: string
          price: number
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          is_hidden?: boolean | null
          name?: string
          price?: number
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          pincode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          phone: string
          pincode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          phone: string
          pincode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          pincode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          user_id: string
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          user_id: string
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          user_id?: string
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "online"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "online"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
