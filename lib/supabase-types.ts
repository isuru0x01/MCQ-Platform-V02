export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      Invoice: {
        Row: {
          amountDue: number | null
          amountPaid: number
          createdAt: string
          currency: string
          id: number
          invoiceId: string
          status: string
          subscriptionId: string
          userId: number | null
        }
        Insert: {
          amountDue?: number | null
          amountPaid: number
          createdAt?: string
          currency: string
          id?: number
          invoiceId: string
          status: string
          subscriptionId: string
          userId?: number | null
        }
        Update: {
          amountDue?: number | null
          amountPaid?: number
          createdAt?: string
          currency?: string
          id?: number
          invoiceId?: string
          status?: string
          subscriptionId?: string
          userId?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      MCQ: {
        Row: {
          correctOption: string
          id: number
          optionA: string
          optionB: string
          optionC: string
          optionD: string
          question: string
          quizId: number
        }
        Insert: {
          correctOption: string
          id?: number
          optionA: string
          optionB: string
          optionC: string
          optionD: string
          question: string
          quizId: number
        }
        Update: {
          correctOption?: string
          id?: number
          optionA?: string
          optionB?: string
          optionC?: string
          optionD?: string
          question?: string
          quizId?: number
        }
        Relationships: [
          {
            foreignKeyName: "MCQ_quizId_fkey"
            columns: ["quizId"]
            isOneToOne: false
            referencedRelation: "Quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      Payment: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          email: string
          id: number
          paymentDate: string
          stripeId: string
          userId: number
        }
        Insert: {
          amount: number
          createdAt?: string
          currency: string
          email: string
          id?: number
          paymentDate: string
          stripeId: string
          userId: number
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          email?: string
          id?: number
          paymentDate?: string
          stripeId?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "Payment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Performance: {
        Row: {
          correctAnswers: number
          createdAt: string
          id: string
          quizId: number
          totalQuestions: number
          userId: string
        }
        Insert: {
          correctAnswers: number
          createdAt?: string
          id?: string
          quizId: number
          totalQuestions: number
          userId: string
        }
        Update: {
          correctAnswers?: number
          createdAt?: string
          id?: string
          quizId?: number
          totalQuestions?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Performance_quizId_fkey"
            columns: ["quizId"]
            isOneToOne: false
            referencedRelation: "Quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      Quiz: {
        Row: {
          createdAt: string
          id: number
          resourceId: number
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: number
          resourceId: number
          userId: string
        }
        Update: {
          createdAt?: string
          id?: number
          resourceId?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Quiz_resourceId_fkey"
            columns: ["resourceId"]
            isOneToOne: false
            referencedRelation: "Resource"
            referencedColumns: ["id"]
          },
        ]
      }
      Resource: {
        Row: {
          content: string | null
          createdAt: string
          id: number
          image_url: string | null
          title: string | null
          type: string
          url: string
          userId: string
        }
        Insert: {
          content?: string | null
          createdAt?: string
          id?: number
          image_url?: string | null
          title?: string | null
          type: string
          url: string
          userId: string
        }
        Update: {
          content?: string | null
          createdAt?: string
          id?: number
          image_url?: string | null
          title?: string | null
          type?: string
          url?: string
          userId?: string
        }
        Relationships: []
      }
      SubscriptionPlan: {
        Row: {
          createdAt: string
          currency: string
          description: string
          id: number
          interval: string
          name: string
          price: number
        }
        Insert: {
          createdAt?: string
          currency: string
          description: string
          id?: number
          interval: string
          name: string
          price: number
        }
        Update: {
          createdAt?: string
          currency?: string
          description?: string
          id?: number
          interval?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      User: {
        Row: {
          createdAt: string
          email: string
          id: number
          password: string
          subscriptionPlanId: number | null
          username: string
        }
        Insert: {
          createdAt?: string
          email: string
          id?: number
          password: string
          subscriptionPlanId?: number | null
          username: string
        }
        Update: {
          createdAt?: string
          email?: string
          id?: number
          password?: string
          subscriptionPlanId?: number | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_subscriptionPlanId_fkey"
            columns: ["subscriptionPlanId"]
            isOneToOne: false
            referencedRelation: "SubscriptionPlan"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_resource_and_associated_data: {
        Args: {
          resource_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
