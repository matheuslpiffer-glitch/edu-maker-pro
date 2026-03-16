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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          assessment_date: string
          class_name: string
          created_at: string
          id: string
          institution_name: string
          logo_url: string
          question_ids: Json
          teacher_name: string
          title: string
          user_id: string
        }
        Insert: {
          assessment_date?: string
          class_name?: string
          created_at?: string
          id?: string
          institution_name?: string
          logo_url?: string
          question_ids?: Json
          teacher_name?: string
          title?: string
          user_id: string
        }
        Update: {
          assessment_date?: string
          class_name?: string
          created_at?: string
          id?: string
          institution_name?: string
          logo_url?: string
          question_ids?: Json
          teacher_name?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          category: string
          created_at: string
          description: string
          duration_minutes: number
          event_date: string
          event_type: string
          id: string
          location: string
          reminder_sent: boolean
          title: string
          updated_at: string
          user_id: string
          whatsapp_webhook_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          duration_minutes?: number
          event_date?: string
          event_type?: string
          id?: string
          location?: string
          reminder_sent?: boolean
          title?: string
          updated_at?: string
          user_id: string
          whatsapp_webhook_url?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration_minutes?: number
          event_date?: string
          event_type?: string
          id?: string
          location?: string
          reminder_sent?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          whatsapp_webhook_url?: string
        }
        Relationships: []
      }
      curriculum_skills: {
        Row: {
          bimester: number
          code: string
          created_at: string
          description: string
          grade: string
          id: string
          knowledge_object: string
          stage: string
          subject_area: string
        }
        Insert: {
          bimester?: number
          code: string
          created_at?: string
          description: string
          grade: string
          id?: string
          knowledge_object?: string
          stage?: string
          subject_area: string
        }
        Update: {
          bimester?: number
          code?: string
          created_at?: string
          description?: string
          grade?: string
          id?: string
          knowledge_object?: string
          stage?: string
          subject_area?: string
        }
        Relationships: []
      }
      essay_corrections: {
        Row: {
          comp1_justification: string
          comp1_score: number
          comp2_justification: string
          comp2_score: number
          comp3_justification: string
          comp3_score: number
          comp4_justification: string
          comp4_score: number
          comp5_justification: string
          comp5_score: number
          created_at: string
          extracted_text: string
          golden_tips: Json
          id: string
          image_url: string
          student_name: string
          total_score: number
          user_id: string
        }
        Insert: {
          comp1_justification?: string
          comp1_score?: number
          comp2_justification?: string
          comp2_score?: number
          comp3_justification?: string
          comp3_score?: number
          comp4_justification?: string
          comp4_score?: number
          comp5_justification?: string
          comp5_score?: number
          created_at?: string
          extracted_text?: string
          golden_tips?: Json
          id?: string
          image_url: string
          student_name?: string
          total_score?: number
          user_id: string
        }
        Update: {
          comp1_justification?: string
          comp1_score?: number
          comp2_justification?: string
          comp2_score?: number
          comp3_justification?: string
          comp3_score?: number
          comp4_justification?: string
          comp4_score?: number
          comp5_justification?: string
          comp5_score?: number
          created_at?: string
          extracted_text?: string
          golden_tips?: Json
          id?: string
          image_url?: string
          student_name?: string
          total_score?: number
          user_id?: string
        }
        Relationships: []
      }
      essay_themes: {
        Row: {
          area: string
          comando: string
          created_at: string
          id: string
          tema: string
          textos_motivadores: Json
          usage_count: number
          user_id: string
        }
        Insert: {
          area?: string
          comando?: string
          created_at?: string
          id?: string
          tema: string
          textos_motivadores?: Json
          usage_count?: number
          user_id: string
        }
        Update: {
          area?: string
          comando?: string
          created_at?: string
          id?: string
          tema?: string
          textos_motivadores?: Json
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      meeting_attendance: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          signed: boolean
          signed_at: string | null
          teacher_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          signed?: boolean
          signed_at?: string | null
          teacher_name: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          signed?: boolean
          signed_at?: string | null
          teacher_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          grade: string
          id: string
          meeting_date: string
          objective: string
          skill_code: string
          skill_description: string
          slides: Json
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          meeting_date?: string
          objective?: string
          skill_code?: string
          skill_description?: string
          slides?: Json
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          meeting_date?: string
          objective?: string
          skill_code?: string
          skill_description?: string
          slides?: Json
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      pisa_simulators: {
        Row: {
          bimester: number
          class_name: string
          competency: string
          created_at: string
          id: string
          institution_name: string
          proficiency_level: number
          questions: Json
          student_results: Json
          title: string
          user_id: string
        }
        Insert: {
          bimester?: number
          class_name?: string
          competency?: string
          created_at?: string
          id?: string
          institution_name?: string
          proficiency_level?: number
          questions?: Json
          student_results?: Json
          title?: string
          user_id: string
        }
        Update: {
          bimester?: number
          class_name?: string
          competency?: string
          created_at?: string
          id?: string
          institution_name?: string
          proficiency_level?: number
          questions?: Json
          student_results?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_banks: {
        Row: {
          created_at: string
          grade: string
          id: string
          institution_name: string
          purpose: string
          question_type: string
          questions: Json
          subject: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          institution_name?: string
          purpose?: string
          question_type?: string
          questions?: Json
          subject?: string
          topic?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          institution_name?: string
          purpose?: string
          question_type?: string
          questions?: Json
          subject?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          content: string
          created_at: string
          difficulty: string
          id: string
          options: Json
          subject_id: string
          topic: string
          type: string
          user_id: string
        }
        Insert: {
          answer?: string
          content?: string
          created_at?: string
          difficulty: string
          id?: string
          options?: Json
          subject_id: string
          topic?: string
          type: string
          user_id: string
        }
        Update: {
          answer?: string
          content?: string
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json
          subject_id?: string
          topic?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      simulators: {
        Row: {
          answer_key: Json
          created_at: string
          exam_type: string
          grade: string
          id: string
          institution_name: string
          questions: Json
          skill_codes: string[]
          student_fields: Json
          subject_area: string
          title: string
          user_id: string
        }
        Insert: {
          answer_key?: Json
          created_at?: string
          exam_type?: string
          grade?: string
          id?: string
          institution_name?: string
          questions?: Json
          skill_codes?: string[]
          student_fields?: Json
          subject_area?: string
          title?: string
          user_id: string
        }
        Update: {
          answer_key?: Json
          created_at?: string
          exam_type?: string
          grade?: string
          id?: string
          institution_name?: string
          questions?: Json
          skill_codes?: string[]
          student_fields?: Json
          subject_area?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          correct_answers: number
          created_at: string
          id: string
          last_activity_at: string
          level: number
          quizzes_completed: number
          subject: string
          total_answers: number
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          id?: string
          last_activity_at?: string
          level?: number
          quizzes_completed?: number
          subject?: string
          total_answers?: number
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          correct_answers?: number
          created_at?: string
          id?: string
          last_activity_at?: string
          level?: number
          quizzes_completed?: number
          subject?: string
          total_answers?: number
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      student_quiz_results: {
        Row: {
          answers: Json
          created_at: string
          exam_type: string
          id: string
          institution: string
          score: number
          time_spent_seconds: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          exam_type?: string
          id?: string
          institution?: string
          score?: number
          time_spent_seconds?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exam_type?: string
          id?: string
          institution?: string
          score?: number
          time_spent_seconds?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      student_results: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          percentage: number
          proficiency_level: string
          simulator_id: string
          student_name: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          percentage?: number
          proficiency_level?: string
          simulator_id: string
          student_name?: string
          total_questions?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          percentage?: number
          proficiency_level?: string
          simulator_id?: string
          student_name?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_results_simulator_id_fkey"
            columns: ["simulator_id"]
            isOneToOne: false
            referencedRelation: "simulators"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
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
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "user" | "student"
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
      app_role: ["admin", "super_admin", "user", "student"],
    },
  },
} as const
