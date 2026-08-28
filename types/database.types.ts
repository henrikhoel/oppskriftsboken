/**
 * Håndskrevne typer som speiler supabase/migrations/*.sql.
 *
 * Dersom du endrer databaseskjemaet, oppdater denne filen tilsvarende (eller,
 * hvis du bruker Supabase CLI: kjør
 * `supabase gen types typescript --local > types/database.types.ts` for å
 * generere den på nytt automatisk).
 *
 * VIKTIG (rettet 28.08.2026, etter Henriks første forsøk på å deploye til
 * Vercel): hver tabell under må ha et `Relationships`-felt (her satt til den
 * tomme tuppelen `[]`, siden denne håndskrevne filen ikke sporer fremmednøkler),
 * og selve public-skjemaet må ha `Views`, `Enums` og `CompositeTypes` i
 * tillegg til Tables/Functions. Uten disse tilfredsstiller ikke Database-typen
 * @supabase/supabase-js sin interne GenericSchema/GenericTable-constraint, og
 * ALLE .from(...)-kall i hele prosjektet faller da stille tilbake til typen
 * `never` under en ekte typesjekk. Dette merkes ikke i vanlig `next dev`
 * eller i editoren (Next sin dev-typesjekk er mykere), men slo full ut som
 * 90+ feil i `next build` sin `tsc`-kjøring, som er det Vercel faktisk kjører.
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          hero_image_is_ai_generated: boolean;
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
          vegetarian_variant: unknown | null;
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
          hero_image_is_ai_generated?: boolean;
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
          vegetarian_variant?: unknown | null;
          rating_sum?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      recipe_tags: {
        Row: { recipe_id: string; tag_id: string };
        Insert: { recipe_id: string; tag_id: string };
        Update: { recipe_id?: string; tag_id?: string };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      knowledge_guide_relations: {
        Row: { guide_id: string; related_guide_id: string; sort_order: number };
        Insert: { guide_id: string; related_guide_id: string; sort_order?: number };
        Update: { guide_id?: string; related_guide_id?: string; sort_order?: number };
        Relationships: [];
      };
      recipe_step_guides: {
        Row: { recipe_step_id: string; guide_id: string; sort_order: number };
        Insert: { recipe_step_id: string; guide_id: string; sort_order?: number };
        Update: { recipe_step_id?: string; guide_id?: string; sort_order?: number };
        Relationships: [];
      };
      // ─────── "I sesong" – se migrasjon 0014 og 0016 ───────
      seasons: {
        Row: {
          id: string;
          slug: string;
          name_no: string;
          name_en: string | null;
          months: number[];
          intro_no: string;
          intro_en: string | null;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_no: string;
          name_en?: string | null;
          months?: number[];
          intro_no?: string;
          intro_en?: string | null;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
        Relationships: [];
      };
      seasonal_ingredients: {
        Row: {
          id: string;
          season_id: string;
          slug: string;
          name_no: string;
          name_en: string | null;
          aliases: string[];
          category: string;
          origin_group: string;
          origin: string;
          available_start_month: number | null;
          available_end_month: number | null;
          season_start_month: number | null;
          season_end_month: number | null;
          peak_start_month: number | null;
          peak_end_month: number | null;
          description_no: string | null;
          description_en: string | null;
          season_note_no: string | null;
          season_note_en: string | null;
          source_name: string | null;
          source_url: string | null;
          source_note: string | null;
          verified_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          slug: string;
          name_no: string;
          name_en?: string | null;
          aliases?: string[];
          category: string;
          origin_group: string;
          origin: string;
          available_start_month?: number | null;
          available_end_month?: number | null;
          season_start_month?: number | null;
          season_end_month?: number | null;
          peak_start_month?: number | null;
          peak_end_month?: number | null;
          description_no?: string | null;
          description_en?: string | null;
          season_note_no?: string | null;
          season_note_en?: string | null;
          source_name?: string | null;
          source_url?: string | null;
          source_note?: string | null;
          verified_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasonal_ingredients"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
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
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
