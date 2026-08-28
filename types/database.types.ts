/**
 * Håndskrevne typer som speiler supabase/migrations/0001_init.sql.
 *
 * Dersom du endrer databaseskjemaet, oppdater denne filen tilsvarende (eller,
 * hvis du bruker Supabase CLI: kjør
 * `supabase gen types typescript --local > types/database.types.ts` for å
 * generere den på nytt automatisk).
 */

export type Difficulty = "enkel" | "middels" | "avansert";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_en: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_en?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
      };
      recipes: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          title_en: string | null;
          description_en: string | null;
          taste_profile: unknown | null;
          nutrition_info: unknown | null;
          hero_image_url: string | null;
          hero_image_alt: string | null;
          category_id: string | null;
          servings: number;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          cook_time_minutes_max: number | null;
          total_time_minutes: number | null;
          difficulty: Difficulty;
          notes: string | null;
          tips: string | null;
          source: string | null;
          is_published: boolean;
          is_featured: boolean;
          featured_sort_order: number | null;
          favorited_by_admin: boolean;
          wine_pairing: string | null;
          vegetarian_note: string | null;
          vegetarian_ingredient_groups: unknown | null;
          vegetarian_steps: unknown | null;
          rating_sum: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string;
          title_en?: string | null;
          description_en?: string | null;
          taste_profile?: unknown | null;
          nutrition_info?: unknown | null;
          hero_image_url?: string | null;
          hero_image_alt?: string | null;
          category_id?: string | null;
          servings?: number;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          cook_time_minutes_max?: number | null;
          total_time_minutes?: number | null;
          difficulty?: Difficulty;
          notes?: string | null;
          tips?: string | null;
          source?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          featured_sort_order?: number | null;
          favorited_by_admin?: boolean;
          wine_pairing?: string | null;
          vegetarian_note?: string | null;
          vegetarian_ingredient_groups?: unknown | null;
          vegetarian_steps?: unknown | null;
          rating_sum?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      recipe_tags: {
        Row: { recipe_id: string; tag_id: string };
        Insert: { recipe_id: string; tag_id: string };
        Update: { recipe_id?: string; tag_id?: string };
      };
      recipe_images: {
        Row: {
          id: string;
          recipe_id: string;
          url: string;
          alt: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          url: string;
          alt?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_images"]["Insert"]>;
      };
      ingredient_groups: {
        Row: {
          id: string;
          recipe_id: string;
          title: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          title?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["ingredient_groups"]["Insert"]>;
      };
      ingredient_items: {
        Row: {
          id: string;
          group_id: string;
          amount: string | null;
          unit: string | null;
          name: string;
          note: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          group_id: string;
          amount?: string | null;
          unit?: string | null;
          name: string;
          note?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["ingredient_items"]["Insert"]>;
      };
      recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          group_title: string | null;
          step_number: number;
          text: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          group_title?: string | null;
          step_number: number;
          text: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_steps"]["Insert"]>;
      };
      ai_suggestion_cache: {
        Row: {
          id: string;
          // NULL = sidevidt svar, ikke knyttet til én bestemt oppskrift
          // (f.eks. mood_mode) – se migrasjon 0007 og ai-cache.ts.
          recipe_id: string | null;
          feature: string;
          cache_key: string;
          payload: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id?: string | null;
          feature: string;
          cache_key: string;
          payload: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_suggestion_cache"]["Insert"]>;
      };
      // ─────── "Hvordan gjør jeg det?" – se migrasjon 0013 ───────
      guide_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          name_en: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          name_en?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["guide_categories"]["Insert"]>;
      };
      knowledge_guides: {
        Row: {
          id: string;
          slug: string;
          title: string;
          title_en: string | null;
          intro: string;
          intro_en: string | null;
          quick_answer_lines: string[];
          quick_answer_lines_en: string[] | null;
          category_id: string | null;
          difficulty: Difficulty;
          estimated_time_minutes: number | null;
          estimated_time_minutes_max: number | null;
          tips: string[];
          tips_en: string[] | null;
          warnings: string[];
          warnings_en: string[] | null;
          search_terms: string[];
          search_terms_en: string[] | null;
          aliases: string[];
          aliases_en: string[] | null;
          is_published: boolean;
          is_demo: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          title_en?: string | null;
          intro?: string;
          intro_en?: string | null;
          quick_answer_lines?: string[];
          quick_answer_lines_en?: string[] | null;
          category_id?: string | null;
          difficulty?: Difficulty;
          estimated_time_minutes?: number | null;
          estimated_time_minutes_max?: number | null;
          tips?: string[];
          tips_en?: string[] | null;
          warnings?: string[];
          warnings_en?: string[] | null;
          search_terms?: string[];
          search_terms_en?: string[] | null;
          aliases?: string[];
          aliases_en?: string[] | null;
          is_published?: boolean;
          is_demo?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_guides"]["Insert"]>;
      };
      knowledge_guide_steps: {
        Row: {
          id: string;
          guide_id: string;
          step_number: number;
          text: string;
          text_en: string | null;
          note: string | null;
          note_en: string | null;
          duration_minutes: number | null;
          temperature: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          guide_id: string;
          step_number: number;
          text: string;
          text_en?: string | null;
          note?: string | null;
          note_en?: string | null;
          duration_minutes?: number | null;
          temperature?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_guide_steps"]["Insert"]>;
      };
      knowledge_guide_relations: {
        Row: { guide_id: string; related_guide_id: string; sort_order: number };
        Insert: { guide_id: string; related_guide_id: string; sort_order?: number };
        Update: { guide_id?: string; related_guide_id?: string; sort_order?: number };
      };
      recipe_step_guides: {
        Row: { recipe_step_id: string; guide_id: string; sort_order: number };
        Insert: { recipe_step_id: string; guide_id: string; sort_order?: number };
        Update: { recipe_step_id?: string; guide_id?: string; sort_order?: number };
      };
    };
    Functions: {
      rate_recipe: {
        Args: {
          recipe_id: string;
          new_stars: number;
          previous_stars?: number | null;
        };
        Returns: { rating_sum: number; rating_count: number }[];
      };
      search_knowledge_guides: {
        Args: {
          search_query: string;
          result_limit?: number;
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          title_en: string | null;
          intro: string;
          intro_en: string | null;
          difficulty: Difficulty;
          estimated_time_minutes: number | null;
          estimated_time_minutes_max: number | null;
          is_demo: boolean;
          category_id: string | null;
          category_slug: string | null;
          category_name: string | null;
          category_name_en: string | null;
          rank: number;
        }[];
      };
    };
  };
}
