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
          // (29.09.2026) Speiler supabase/migrations/0023_cook_mode_tutorial_completed.sql.
          cook_mode_tutorial_completed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          is_admin?: boolean;
          cook_mode_tutorial_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          is_admin?: boolean;
          cook_mode_tutorial_completed?: boolean;
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
          drink_pairing: unknown | null;
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
          // Admin-satt styrkegrad for sterk mat (1-3 chili) – se migrasjon
          // 0028_recipe_spice_level.sql. NULL = ikke sterk/ikke satt.
          spice_level: number | null;
          notes: string | null;
          tips: string | null;
          warnings: string | null;
          source: string | null;
          is_published: boolean;
          is_featured: boolean;
          show_beverage_match_checker: boolean;
          show_meal_builder: boolean;
          featured_sort_order: number | null;
          favorited_by_admin: boolean;
          weekly_menu_excluded: boolean;
          weekly_menu_styles: string[];
          // Admin-satt "er denne oppskriften vegetar?"-bryter – se migrasjon
          // 0027_recipe_is_vegetarian.sql. NOT NULL DEFAULT false.
          is_vegetarian: boolean;
          // Delmengde av "quick" | "cozy" | "impress" | "crowd" | "healthy"
          // – se migrasjon 0020_recipe_mood.sql. Holdt som `string[]` her
          // (ikke MoodId[]) siden denne fila er en håndskrevet speiling av
          // databaseskjemaet, samme prinsipp som difficulty/season-typene
          // andre steder i denne fila. NOT NULL DEFAULT '{}' i databasen –
          // aldri null, kan være en tom liste.
          moods: string[];
          // Delmengde av "starter" | "main" | "side" | "dessert" – se
          // migrasjon 0022_recipe_meal_roles.sql. Samme
          // string[]-fremfor-MealCourseRole[]-begrunnelse som moods over.
          // NOT NULL DEFAULT '{}' i databasen – aldri null, kan være en tom
          // liste.
          courses: string[];
          wine_pairing: string | null;
          vegetarian_note: string | null;
          vegetarian_ingredient_groups: unknown | null;
          vegetarian_steps: unknown | null;
          vegetarian_variant: unknown | null;
          rating_sum: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
          // Admin-styrt visningsrekkefølge for /oppskrifter + "Nyeste
          // oppskrifter" – se migrasjon 0029_recipe_display_order.sql.
          // NOT NULL DEFAULT extract(epoch from now()).
          display_order: number;
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
          drink_pairing?: unknown | null;
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
          spice_level?: number | null;
          notes?: string | null;
          tips?: string | null;
          warnings?: string | null;
          source?: string | null;
          is_published?: boolean;
          is_featured?: boolean;
          show_beverage_match_checker?: boolean;
          show_meal_builder?: boolean;
          featured_sort_order?: number | null;
          favorited_by_admin?: boolean;
          weekly_menu_excluded?: boolean;
          weekly_menu_styles?: string[];
          is_vegetarian?: boolean;
          moods?: string[];
          courses?: string[];
          wine_pairing?: string | null;
          vegetarian_note?: string | null;
          vegetarian_ingredient_groups?: unknown | null;
          vegetarian_steps?: unknown | null;
          vegetarian_variant?: unknown | null;
          rating_sum?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
          display_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recipes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "knowledge_guides_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "guide_categories";
            referencedColumns: ["id"];
          },
        ];
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
      // (26.09.2026) Fellespassordet for hele nettstedet – se filheaderen i
      // supabase/migrations/0019_site_access_password.sql. Nøyaktig én rad.
      // password_hash leses/skrives ALDRI direkte herfra i appkoden (ingen
      // RLS-policy slipper det til) – kun via RPC-funksjonene under.
      site_access: {
        Row: {
          id: boolean;
          password_hash: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          password_hash: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["site_access"]["Insert"]>;
        Relationships: [];
      };
      // (27.09.2026) Kontoeksklusive favoritter – se
      // supabase/migrations/0021_user_accounts.sql. Sammensatt primærnøkkel
      // (user_id, recipe_id), ikke egen id-kolonne.
      favorites: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Insert"]>;
        Relationships: [];
      };
      // (27.09.2026) Kontoeksklusiv handleliste – se
      // supabase/migrations/0021_user_accounts.sql. `entry` speiler
      // ShoppingListEntry (lib/types.ts) minus dens klientsidige `id` –
      // radens egen `id` ER entry-id-en for en innlogget bruker.
      shopping_list_items: {
        Row: {
          id: string;
          user_id: string;
          entry: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry: unknown;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shopping_list_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      // (26.09.2026) Se filheaderen i
      // supabase/migrations/0019_site_access_password.sql – returnerer KUN
      // true/false, eksponerer aldri selve hashen.
      verify_site_password: {
        Args: { candidate: string };
        Returns: boolean;
      };
      set_site_password: {
        Args: { new_password: string };
        Returns: undefined;
      };
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
