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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          player_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          training_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          player_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          training_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          player_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_settings: {
        Row: {
          bg_color: string
          brand_color: string
          id: boolean
          logo_url: string | null
          sidebar_color: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          brand_color?: string
          id?: boolean
          logo_url?: string | null
          sidebar_color?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          brand_color?: string
          id?: boolean
          logo_url?: string | null
          sidebar_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      development_plans: {
        Row: {
          coach_comments: string | null
          deadlines: string | null
          frequency: string | null
          id: string
          indicators: string | null
          player_comments: string | null
          player_id: string
          recommended_exercises: string | null
          strengths: string | null
          updated_at: string
          weaknesses: string | null
        }
        Insert: {
          coach_comments?: string | null
          deadlines?: string | null
          frequency?: string | null
          id?: string
          indicators?: string | null
          player_comments?: string | null
          player_id: string
          recommended_exercises?: string | null
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Update: {
          coach_comments?: string | null
          deadlines?: string | null
          frequency?: string | null
          id?: string
          indicators?: string | null
          player_comments?: string | null
          player_id?: string
          recommended_exercises?: string | null
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          comment: string | null
          created_at: string
          evaluated_at: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id: string | null
          goal_id: string | null
          id: string
          player_id: string
          score: number
          skill_id: string | null
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          evaluated_at?: string
          evaluation_type: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id?: string | null
          goal_id?: string | null
          id?: string
          player_id: string
          score: number
          skill_id?: string | null
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          evaluated_at?: string
          evaluation_type?: Database["public"]["Enums"]["evaluation_type"]
          evaluator_id?: string | null
          goal_id?: string | null
          id?: string
          player_id?: string
          score?: number
          skill_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          initial_level: string | null
          planned_actions: string | null
          player_id: string
          priority: string | null
          responsible_id: string | null
          status: Database["public"]["Enums"]["goal_status"]
          success_indicator: string | null
          target_level: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          initial_level?: string | null
          planned_actions?: string | null
          player_id: string
          priority?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          success_indicator?: string | null
          target_level?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          initial_level?: string | null
          planned_actions?: string | null
          player_id?: string
          priority?: string | null
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          success_indicator?: string | null
          target_level?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          competition: string | null
          created_at: string
          date: string
          home_away: Database["public"]["Enums"]["home_away"]
          id: string
          opponent: string
          score_them: number | null
          score_us: number | null
          team_id: string | null
        }
        Insert: {
          competition?: string | null
          created_at?: string
          date: string
          home_away?: Database["public"]["Enums"]["home_away"]
          id?: string
          opponent: string
          score_them?: number | null
          score_us?: number | null
          team_id?: string | null
        }
        Update: {
          competition?: string | null
          created_at?: string
          date?: string
          home_away?: Database["public"]["Enums"]["home_away"]
          id?: string
          opponent?: string
          score_them?: number | null
          score_us?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_player: {
        Row: {
          parent_id: string
          player_id: string
        }
        Insert: {
          parent_id: string
          player_id: string
        }
        Update: {
          parent_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_player_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_player_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stats: {
        Row: {
          assists: number | null
          blocks: number | null
          def_reb: number | null
          fg_attempted: number | null
          fg_made: number | null
          fouls: number | null
          ft_attempted: number | null
          ft_made: number | null
          id: string
          match_id: string
          minutes: number | null
          off_reb: number | null
          player_id: string
          plus_minus: number | null
          points: number | null
          steals: number | null
          three_attempted: number | null
          three_made: number | null
          total_reb: number | null
          turnovers: number | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          def_reb?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          id?: string
          match_id: string
          minutes?: number | null
          off_reb?: number | null
          player_id: string
          plus_minus?: number | null
          points?: number | null
          steals?: number | null
          three_attempted?: number | null
          three_made?: number | null
          total_reb?: number | null
          turnovers?: number | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          def_reb?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          id?: string
          match_id?: string
          minutes?: number | null
          off_reb?: number | null
          player_id?: string
          plus_minus?: number | null
          points?: number | null
          steals?: number | null
          three_attempted?: number | null
          three_made?: number | null
          total_reb?: number | null
          turnovers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string
          created_at: string
          dominant_hand: Database["public"]["Enums"]["dominant_hand"] | null
          entry_date: string | null
          first_name: string
          height_cm: number | null
          id: string
          jersey_number: number | null
          last_name: string
          photo_url: string | null
          previous_club: string | null
          primary_position: string | null
          season_id: string | null
          secondary_position: string | null
          status: Database["public"]["Enums"]["player_status"]
          team_id: string | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
          wingspan_cm: number | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          dominant_hand?: Database["public"]["Enums"]["dominant_hand"] | null
          entry_date?: string | null
          first_name: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_name: string
          photo_url?: string | null
          previous_club?: string | null
          primary_position?: string | null
          season_id?: string | null
          secondary_position?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
          wingspan_cm?: number | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          dominant_hand?: Database["public"]["Enums"]["dominant_hand"] | null
          entry_date?: string | null
          first_name?: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_name?: string
          photo_url?: string | null
          previous_club?: string | null
          primary_position?: string | null
          season_id?: string | null
          secondary_position?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
          wingspan_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          label: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          label: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          id: string
          name: string
          scale_max: number
          scale_min: number
        }
        Insert: {
          category: Database["public"]["Enums"]["skill_category"]
          id?: string
          name: string
          scale_max?: number
          scale_min?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          id?: string
          name?: string
          scale_max?: number
          scale_min?: number
        }
        Relationships: []
      }
      team_coaches: {
        Row: {
          coach_id: string
          team_id: string
        }
        Insert: {
          coach_id: string
          team_id: string
        }
        Update: {
          coach_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_coaches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          season_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          season_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      training_exercises: {
        Row: {
          block_type: string
          comment: string | null
          duration_minutes: number | null
          id: string
          name: string
          position: number
          skill_id: string | null
          training_id: string
          video_url: string | null
        }
        Insert: {
          block_type?: string
          comment?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          position?: number
          skill_id?: string | null
          training_id: string
          video_url?: string | null
        }
        Update: {
          block_type?: string
          comment?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          position?: number
          skill_id?: string | null
          training_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercises_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          coach_id: string | null
          comment: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          gym_id: string | null
          id: string
          intensity: string | null
          objective: string | null
          start_time: string | null
          team_id: string | null
        }
        Insert: {
          coach_id?: string | null
          comment?: string | null
          created_at?: string
          date: string
          duration_minutes?: number | null
          gym_id?: string | null
          id?: string
          intensity?: string | null
          objective?: string | null
          start_time?: string | null
          team_id?: string | null
        }
        Update: {
          coach_id?: string | null
          comment?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          gym_id?: string | null
          id?: string
          intensity?: string | null
          objective?: string | null
          start_time?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coaches_player: { Args: { p_id: string }; Returns: boolean }
      coaches_team: { Args: { t_id: string }; Returns: boolean }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_own_player: { Args: { p_id: string }; Returns: boolean }
      is_parent_of: { Args: { p_id: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      attendance_status:
        | "present"
        | "absent"
        | "absent_justifie"
        | "retard"
        | "blesse"
      dominant_hand: "droite" | "gauche" | "ambidextre"
      evaluation_type: "technique" | "tactique" | "physique" | "mental"
      goal_status:
        | "a_commencer"
        | "en_cours"
        | "atteint"
        | "partiellement_atteint"
        | "abandonne"
      home_away: "domicile" | "exterieur"
      player_status: "actif" | "inactif" | "blesse" | "parti"
      skill_category:
        | "tir"
        | "dribble"
        | "finition"
        | "passe"
        | "defense"
        | "rebond"
        | "tactique"
        | "physique"
        | "mental"
      user_role:
        | "admin"
        | "directeur_sportif"
        | "coach"
        | "preparateur_physique"
        | "joueur"
        | "parent"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attendance_status: [
        "present",
        "absent",
        "absent_justifie",
        "retard",
        "blesse",
      ],
      dominant_hand: ["droite", "gauche", "ambidextre"],
      evaluation_type: ["technique", "tactique", "physique", "mental"],
      goal_status: [
        "a_commencer",
        "en_cours",
        "atteint",
        "partiellement_atteint",
        "abandonne",
      ],
      home_away: ["domicile", "exterieur"],
      player_status: ["actif", "inactif", "blesse", "parti"],
      skill_category: [
        "tir",
        "dribble",
        "finition",
        "passe",
        "defense",
        "rebond",
        "tactique",
        "physique",
        "mental",
      ],
      user_role: [
        "admin",
        "directeur_sportif",
        "coach",
        "preparateur_physique",
        "joueur",
        "parent",
      ],
    },
  },
} as const
