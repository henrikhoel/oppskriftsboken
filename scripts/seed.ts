/**
 * Seeder Supabase-databasen med kategoriene og eksempeloppskriftene fra
 * lib/demo-data/*. Kjøres med: npm run seed
 *
 * Krever at .env.local har NEXT_PUBLIC_SUPABASE_URL og
 * SUPABASE_SERVICE_ROLE_KEY satt (service-rollen går utenom RLS, så
 * scriptet fungerer selv før du har en admin-bruker).
 *
 * Trygt å kjøre flere ganger – kategorier og oppskrifter identifiseres på
 * slug, så re-kjøring oppdaterer eksisterende rader i stedet for å
 * duplisere dem.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { demoCategories } from "../lib/demo-data/categories";
import { demoRecipes } from "../lib/demo-data/recipes";
import type { Database } from "../types/database.types";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local. Se README.md.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("→ Seeder kategorier …");
  const categorySlugToId = new Map<string, string>();

  for (const category of demoCategories) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        { slug: category.slug, name: category.name, sort_order: category.sortOrder },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Kunne ikke seede kategori ${category.slug}: ${error?.message}`);
    }
    categorySlugToId.set(data.slug, data.id);
  }
  console.log(`  ${categorySlugToId.size} kategorier klare.`);

  console.log("→ Seeder oppskrifter …");
  let count = 0;

  for (const recipe of demoRecipes) {
    const categoryId = recipe.category ? categorySlugToId.get(recipe.category.slug) ?? null : null;

    const { data: recipeRow, error: recipeError } = await supabase
      .from("recipes")
      .upsert(
        {
          slug: recipe.slug,
          title: recipe.title,
          description: recipe.description,
          hero_image_url: recipe.heroImageUrl,
          hero_image_alt: recipe.heroImageAlt,
          category_id: categoryId,
          servings: recipe.servings,
          prep_time_minutes: recipe.prepTimeMinutes,
          cook_time_minutes: recipe.cookTimeMinutes,
          total_time_minutes: recipe.totalTimeMinutes,
          difficulty: recipe.difficulty,
          notes: recipe.notes,
          tips: recipe.tips,
          source: recipe.source,
          is_published: recipe.isPublished,
          is_featured: recipe.isFeatured,
          favorited_by_admin: recipe.favoritedByAdmin,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (recipeError || !recipeRow) {
      throw new Error(`Kunne ikke seede oppskrift ${recipe.slug}: ${recipeError?.message}`);
    }

    const recipeId = recipeRow.id;

    // Fjern eksisterende barne-rader slik at re-kjøring er trygt (unngår duplikater).
    await supabase.from("ingredient_groups").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_images").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_tags").delete().eq("recipe_id", recipeId);

    for (const [groupIndex, group] of recipe.ingredientGroups.entries()) {
      const { data: groupRow, error: groupError } = await supabase
        .from("ingredient_groups")
        .insert({ recipe_id: recipeId, title: group.title, sort_order: groupIndex })
        .select("id")
        .single();

      if (groupError || !groupRow) {
        throw new Error(`Kunne ikke seede ingrediensgruppe for ${recipe.slug}: ${groupError?.message}`);
      }

      const itemsPayload = group.items.map((item, itemIndex) => ({
        group_id: groupRow.id,
        amount: item.amount,
        unit: item.unit,
        name: item.name,
        note: item.note,
        sort_order: itemIndex,
      }));

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase.from("ingredient_items").insert(itemsPayload);
        if (itemsError) throw new Error(`Kunne ikke seede ingredienser for ${recipe.slug}: ${itemsError.message}`);
      }
    }

    const stepsPayload = recipe.steps.map((step, index) => ({
      recipe_id: recipeId,
      group_title: step.groupTitle,
      step_number: index + 1,
      text: step.text,
      sort_order: index,
    }));
    if (stepsPayload.length > 0) {
      const { error: stepsError } = await supabase.from("recipe_steps").insert(stepsPayload);
      if (stepsError) throw new Error(`Kunne ikke seede steg for ${recipe.slug}: ${stepsError.message}`);
    }

    if (recipe.images.length > 0) {
      const imagesPayload = recipe.images.map((img, index) => ({
        recipe_id: recipeId,
        url: img.url,
        alt: img.alt,
        sort_order: index,
      }));
      const { error: imagesError } = await supabase.from("recipe_images").insert(imagesPayload);
      if (imagesError) throw new Error(`Kunne ikke seede bilder for ${recipe.slug}: ${imagesError.message}`);
    }

    if (recipe.tags.length > 0) {
      const tagIds: string[] = [];
      for (const tag of recipe.tags) {
        const { data: tagRow, error: tagError } = await supabase
          .from("tags")
          .upsert({ slug: tag.slug, name: tag.name }, { onConflict: "slug" })
          .select("id")
          .single();
        if (tagError || !tagRow) {
          throw new Error(`Kunne ikke seede tag ${tag.slug}: ${tagError?.message}`);
        }
        tagIds.push(tagRow.id);
      }
      const { error: tagLinkError } = await supabase
        .from("recipe_tags")
        .insert(tagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id })));
      if (tagLinkError) throw new Error(`Kunne ikke seede tag-kobling for ${recipe.slug}: ${tagLinkError.message}`);
    }

    count += 1;
    console.log(`  ✓ ${recipe.title}`);
  }

  console.log(`\nFerdig! Seedet ${count} oppskrifter og ${categorySlugToId.size} kategorier.`);
  console.log(
    "Husk: opprett en bruker via Supabase Auth og sett is_admin = true i profiles-tabellen for å få admin-tilgang. Se README.md.",
  );
}

main().catch((err) => {
  console.error("\nSeeding feilet:", err instanceof Error ? err.message : err);
  process.exit(1);
});
