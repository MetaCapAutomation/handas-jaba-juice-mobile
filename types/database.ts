export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          delivery_date: string | null
          email: string
          follower_count: string | null
          full_name: string
          id: string
          intended_quantity: string | null
          location: string
          phone: string
          platforms: string[] | null
          social_media_handle: string | null
          status: string
          type: string
          updated_at: string
          why_ambassador: string | null
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          delivery_date?: string | null
          email: string
          follower_count?: string | null
          full_name: string
          id?: string
          intended_quantity?: string | null
          location: string
          phone: string
          platforms?: string[] | null
          social_media_handle?: string | null
          status?: string
          type: string
          updated_at?: string
          why_ambassador?: string | null
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          delivery_date?: string | null
          email?: string
          follower_count?: string | null
          full_name?: string
          id?: string
          intended_quantity?: string | null
          location?: string
          phone?: string
          platforms?: string[] | null
          social_media_handle?: string | null
          status?: string
          type?: string
          updated_at?: string
          why_ambassador?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image_fit: string | null
          cover_image_position: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_archived: boolean
          is_published: boolean
          read_time_minutes: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content?: string
          cover_image_fit?: string | null
          cover_image_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          read_time_minutes?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image_fit?: string | null
          cover_image_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          read_time_minutes?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      branch_inventory: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          inventory_id: string
          low_stock_threshold: number
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          inventory_id: string
          low_stock_threshold?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          inventory_id?: string
          low_stock_threshold?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      branch_users: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          opening_hours: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          opening_hours?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          opening_hours?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          is_admin: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          max_uses: number | null
          min_order_amount: number
          type: string
          updated_at: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          max_uses?: number | null
          min_order_amount?: number
          type: string
          updated_at?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          max_uses?: number | null
          min_order_amount?: number
          type?: string
          updated_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_archived: boolean
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          source: string | null
          subscribed_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          branch_id: string | null
          country: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          delivery_address: string
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_phone: string | null
          discount_amount: number | null
          id: string
          is_international: boolean
          items: Json
          notes: string | null
          order_number: string
          payment_reference: string | null
          rider_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          country?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address: string
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_phone?: string | null
          discount_amount?: number | null
          id?: string
          is_international?: boolean
          items?: Json
          notes?: string | null
          order_number: string
          payment_reference?: string | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          country?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address?: string
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_phone?: string | null
          discount_amount?: number | null
          id?: string
          is_international?: boolean
          items?: Json
          notes?: string | null
          order_number?: string
          payment_reference?: string | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp?: string
          used?: boolean
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          inventory_id: string
          is_active: boolean
          name: string
          price: number | null
          sort_order: number
          updated_at: string
          variation_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          inventory_id: string
          is_active?: boolean
          name: string
          price?: number | null
          sort_order?: number
          updated_at?: string
          variation_type: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          inventory_id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          sort_order?: number
          updated_at?: string
          variation_type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          additional_images: string[] | null
          badge: string | null
          category: string
          created_at: string
          display_on_website: boolean
          features: string[] | null
          full_description: string | null
          id: string
          image_url: string | null
          inventory_id: string
          is_archived: boolean
          perfect_for: string[] | null
          short_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          additional_images?: string[] | null
          badge?: string | null
          category?: string
          created_at?: string
          display_on_website?: boolean
          features?: string[] | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          inventory_id: string
          is_archived?: boolean
          perfect_for?: string[] | null
          short_name?: string
          slug: string
          updated_at?: string
        }
        Update: {
          additional_images?: string[] | null
          badge?: string | null
          category?: string
          created_at?: string
          display_on_website?: boolean
          features?: string[] | null
          full_description?: string | null
          id?: string
          image_url?: string | null
          inventory_id?: string
          is_archived?: boolean
          perfect_for?: string[] | null
          short_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          expo_push_token: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restock_requests: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rider_locations: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          rider_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          rider_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          rider_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          license_plate: string | null
          motorcycle_images: string[] | null
          notes: string | null
          phone: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          license_plate?: string | null
          motorcycle_images?: string[] | null
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_plate?: string | null
          motorcycle_images?: string[] | null
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          branch_id: string | null
          category: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string
          id: string
          priority: string
          source: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          category?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description: string
          id?: string
          priority?: string
          source?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          branch_id?: string | null
          category?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string
          id?: string
          priority?: string
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_responses: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean
          responder_email: string | null
          responder_id: string | null
          responder_name: string | null
          responder_role: string | null
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          responder_email?: string | null
          responder_id?: string | null
          responder_name?: string | null
          responder_role?: string | null
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          responder_email?: string | null
          responder_id?: string | null
          responder_name?: string | null
          responder_role?: string | null
          ticket_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      customer_can_view_rider: {
        Args: { _rider_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      get_users_count: { Args: Record<PropertyKey, never>; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "branch_manager" | "rider"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "confirmed"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "branch_manager", "rider"],
      order_status: [
        "pending", "paid", "processing", "confirmed",
        "out_for_delivery", "delivered", "cancelled",
      ],
    },
  },
} as const
