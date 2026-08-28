/**
 * Seeder Supabase-databasen med innhold fra lib/demo-data/*. Delt opp i tre
 * uavhengige deler (oppskrifter+kategorier, guider, sesonginnhold) som hver
 * kun kjøres når du eksplisitt ber om det, se flagg-tabellen under.
 *
 * `npm run seed`           → KUN sesonginnhold (`seedSeasons`)
 * `npm run seed:guides`    → KUN "Hvordan gjør jeg det?"-guidene
 * `npm run seed:recipes`   → KUN eksempeloppskriftene + kategoriene
 * `npm run seed:all`       → alt sammen
 *
 * Endret 28.08.2026, i to omganger, begge ganger etter ønske fra Henrik:
 * (1) demo-oppskriftene (Trøffelpasta og de andre) kom tilbake for hver
 * `npm run seed`-kjøring selv etter at han hadde slettet dem, fordi
 * seedRecipesAndCategories() upserter på slug og ikke kan skille "aldri
 * seedet" fra "bevisst slettet" – løst ved å gjøre oppskrift-seedingen
 * opt-in. (2) samme problem gjaldt guidene, OG guide-seedingen er i seg
 * selv tidkrevende (85+ guider, hver med flere database-kall) – noe som
 * gjorde en rask `npm run seed` for kun å oppdatere sesonginnhold unødig
 * treg. Løsningen er den samme: gjør hver av de tre delene uavhengig
 * opt-in via flagg, i stedet for å late som om "seed alt" er det eneste
 * fornuftige standardvalget. Sesonginnhold er det som kjøres uten flagg
 * fordi det er det Henrik aktivt jobber på nå – ikke fordi det er
 * "viktigere" enn de to andre.
 *
 * Krever at .env.local har NEXT_PUBLIC_SUPABASE_URL og
 * SUPABASE_SERVICE_ROLE_KEY satt (service-rollen går utenom RLS, så
 * scriptet fungerer selv før du har en admin-bruker).
 *
 * Hver del er trygg å kjøre flere ganger for seg selv – alt identifiseres
 * på slug, så re-kjøring oppdaterer eksisterende rader i stedet for å
 * duplisere dem. (Det er nettopp DENNE idempotensen som var årsaken til
 * problemet over – den forutsetter at raden fortsatt finnes, ikke at den
 * er bevisst slettet.)
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { demoCategories } from "../lib/demo-data/categories";
import { demoRecipes } from "../lib/demo-data/recipes";
import { demoGuideCategories } from "../lib/demo-data/guide-categories";
import { demoGuides } from "../lib/demo-data/guides";
import { demoSeasons, demoSeasonalIngredients } from "../lib/demo-data/seasons";
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

/**
 * Seeder kategoriene og eksempeloppskriftene (Trøffelpasta og de andre) fra
 * lib/demo-data/categories.ts og lib/demo-data/recipes.ts. IKKE kjørt fra
 * main() lenger som standard – se filheaderen øverst for hvorfor. Kjøres
 * eksplisitt med `npm run seed:recipes`.
 */
async function seedRecipesAndCategories() {
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
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  // Ingen flagg i det hele tatt = kjør KUN sesonginnhold (den raske,
  // hyppig-itererte standarden, se filheaderen). Så snart ETT flagg er gitt
  // eksplisitt, kjøres KUN det du faktisk ba om – "npm run seed:recipes"
  // skal f.eks. ikke også kjøre sesonginnhold på slep.
  const anyExplicitFlag = args.some((a) => a.startsWith("--"));
  const wantsRecipes = all || args.includes("--recipes");
  const wantsGuides = all || args.includes("--guides");
  const wantsSeasons = all || args.includes("--seasons") || !anyExplicitFlag;

  if (wantsRecipes) await seedRecipesAndCategories();
  if (wantsGuides) await seedGuides();
  if (wantsSeasons) await seedSeasons();

  const skipped: string[] = [];
  if (!wantsRecipes) skipped.push("oppskrifter/kategorier (`npm run seed:recipes`)");
  if (!wantsGuides) skipped.push("guider (`npm run seed:guides`)");
  if (!wantsSeasons) skipped.push("sesonginnhold (`npm run seed:seasons`)");
  if (skipped.length > 0) {
    console.log(`\n(Hoppet over: ${skipped.join(", ")}. Kjør \`npm run seed:all\` for å seede alt på én gang.)`);
  }

  console.log(
    "\nHusk: opprett en bruker via Supabase Auth og sett is_admin = true i profiles-tabellen for å få admin-tilgang. Se README.md.",
  );
}

/**
 * Seeder "Hvordan gjør jeg det?"-kategoriene og demo-/placeholder-guidene
 * fra lib/demo-data/guide-categories.ts og lib/demo-data/guides.ts – samme
 * upsert-på-slug-mønster som resten av dette scriptet (se filheader), mot de
 * nye tabellene i supabase/migrations/0013_knowledge_guides.sql. Kjøres kun
 * hvis den migrasjonen faktisk er kjørt i Supabase-prosjektet – upsert mot
 * en tabell som ikke finnes ennå feiler tydelig med et forklarende
 * feilsøk-hint i stedet for et kryptisk Postgres-feilsvar.
 */
async function seedGuides() {
  console.log("→ Seeder guide-kategorier …");
  const guideCategorySlugToId = new Map<string, string>();

  for (const category of demoGuideCategories) {
    const { data, error } = await supabase
      .from("guide_categories")
      .upsert(
        { slug: category.slug, name: category.name, name_en: category.nameEn, sort_order: category.sortOrder },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(
        `Kunne ikke seede guide-kategori ${category.slug}: ${error?.message} (er migrasjon 0013_knowledge_guides.sql kjørt i Supabase?)`,
      );
    }
    guideCategorySlugToId.set(data.slug, data.id);
  }
  console.log(`  ${guideCategorySlugToId.size} guide-kategorier klare.`);

  console.log("→ Seeder guider …");
  const guideSlugToId = new Map<string, string>();

  // Første runde: sett inn/oppdater selve guide-radene og bygg en
  // slug->id-oversikt FØR vi skriver relaterte guider under, siden
  // relatedGuides kan peke til en guide som defineres senere i
  // demoGuides-arrayet.
  for (const guide of demoGuides) {
    const categoryId = guide.category ? guideCategorySlugToId.get(guide.category.slug) ?? null : null;

    const { data: guideRow, error } = await supabase
      .from("knowledge_guides")
      .upsert(
        {
          slug: guide.slug,
          title: guide.title,
          title_en: guide.titleEn,
          intro: guide.intro,
          intro_en: guide.introEn,
          quick_answer_lines: guide.quickAnswerLines,
          quick_answer_lines_en: guide.quickAnswerLinesEn,
          category_id: categoryId,
          difficulty: guide.difficulty,
          estimated_time_minutes: guide.estimatedTimeMinutes,
          estimated_time_minutes_max: guide.estimatedTimeMinutesMax,
          tips: guide.tips,
          tips_en: guide.tipsEn,
          warnings: guide.warnings,
          warnings_en: guide.warningsEn,
          search_terms: guide.searchTerms,
          search_terms_en: guide.searchTermsEn,
          aliases: guide.aliases,
          aliases_en: guide.aliasesEn,
          is_published: guide.isPublished,
          is_demo: guide.isDemo,
          sort_order: guide.sortOrder,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !guideRow) {
      throw new Error(`Kunne ikke seede guide ${guide.slug}: ${error?.message}`);
    }
    guideSlugToId.set(guideRow.slug, guideRow.id);
  }

  // Andre runde: steg og relasjoner, nå som alle guide-id-er er kjent.
  let guideCount = 0;
  for (const guide of demoGuides) {
    const guideId = guideSlugToId.get(guide.slug);
    if (!guideId) continue;

    await supabase.from("knowledge_guide_steps").delete().eq("guide_id", guideId);
    await supabase.from("knowledge_guide_relations").delete().eq("guide_id", guideId);

    const stepsPayload = guide.steps.map((step, index) => ({
      guide_id: guideId,
      step_number: index + 1,
      text: step.text,
      text_en: step.textEn,
      note: step.note,
      note_en: step.noteEn,
      duration_minutes: step.durationMinutes,
      temperature: step.temperature,
      sort_order: index,
    }));
    if (stepsPayload.length > 0) {
      const { error: stepsError } = await supabase.from("knowledge_guide_steps").insert(stepsPayload);
      if (stepsError) throw new Error(`Kunne ikke seede steg for guide ${guide.slug}: ${stepsError.message}`);
    }

    const relatedIds = guide.relatedGuides
      .map((r) => guideSlugToId.get(r.slug))
      .filter((id): id is string => Boolean(id) && id !== guideId);
    if (relatedIds.length > 0) {
      const relationsPayload = relatedIds.map((relatedGuideId, index) => ({
        guide_id: guideId,
        related_guide_id: relatedGuideId,
        sort_order: index,
      }));
      const { error: relationsError } = await supabase
        .from("knowledge_guide_relations")
        .insert(relationsPayload);
      if (relationsError) {
        throw new Error(`Kunne ikke seede relaterte guider for ${guide.slug}: ${relationsError.message}`);
      }
    }

    guideCount += 1;
    console.log(`  ✓ ${guide.title}`);
  }

  console.log(`Ferdig! Seedet ${guideCount} guider og ${guideCategorySlugToId.size} guide-kategorier.`);
}

/**
 * Seeder "I sesong"-sesongene og sesongråvarene fra
 * lib/demo-data/seasons.ts – samme to-runders upsert-på-slug-mønster som
 * seedGuides() over, mot tabellene i
 * supabase/migrations/0014_seasons.sql. Kjøres kun hvis den migrasjonen
 * faktisk er kjørt i Supabase-prosjektet – upsert mot en tabell som ikke
 * finnes ennå feiler tydelig med et forklarende feilsøk-hint i stedet for
 * et kryptisk Postgres-feilsvar.
 */
async function seedSeasons() {
  console.log("→ Seeder sesonger …");
  const seasonSlugToId = new Map<string, string>();

  for (const season of demoSeasons) {
    const { data, error } = await supabase
      .from("seasons")
      .upsert(
        {
          slug: season.slug,
          name_no: season.nameNo,
          name_en: season.nameEn,
          months: season.months,
          intro_no: season.introNo,
          intro_en: season.introEn,
          sort_order: season.sortOrder,
          is_published: season.isPublished,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(
        `Kunne ikke seede sesong ${season.slug}: ${error?.message} (er migrasjon 0014_seasons.sql kjørt i Supabase?)`,
      );
    }
    seasonSlugToId.set(season.id, data.id);
  }
  console.log(`  ${seasonSlugToId.size} sesonger klare.`);

  console.log("→ Seeder sesongråvarer …");
  let ingredientCount = 0;

  // Sletter ALLE eksisterende sesongråvarer FØR noe settes inn på nytt – IKKE
  // per-sesong inni løpet under (slik det var før 28.08.2026). `slug` er
  // unikt PÅ TVERS av alle råvarer (se 0016_season_ingredient_richness.sql),
  // og en råvare kan ha byttet hjemme-sesong mellom det gamle og det nye
  // datasettet (f.eks. "brokkoli" flyttet fra Sommer til Forsommer i denne
  // utvidelsen) – med per-sesong slett-og-sett-inn ville INSERT for
  // forsommer's nye "brokkoli"-rad kollidert med den ennå ikke slettede,
  // gamle "brokkoli"-raden under Sommer (som først slettes SENERE i løpet),
  // og gitt "duplicate key value violates unique constraint
  // seasonal_ingredients_slug_key". Ved å tømme HELE tabellen først finnes
  // det ingen gamle rader igjen å kollidere med når innsettingen begynner.
  await supabase.from("seasonal_ingredients").delete().not("id", "is", null);

  for (const season of demoSeasons) {
    const realSeasonId = seasonSlugToId.get(season.id);
    if (!realSeasonId) continue;

    const ingredientsForSeason = demoSeasonalIngredients
      .filter((i) => i.seasonId === season.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (ingredientsForSeason.length === 0) continue;

    const payload = ingredientsForSeason.map((ingredient, index) => ({
      season_id: realSeasonId,
      slug: ingredient.slug,
      name_no: ingredient.nameNo,
      name_en: ingredient.nameEn,
      aliases: ingredient.aliases,
      category: ingredient.category,
      origin_group: ingredient.originGroup,
      origin: ingredient.origin,
      available_start_month: ingredient.availableStartMonth,
      available_end_month: ingredient.availableEndMonth,
      season_start_month: ingredient.seasonStartMonth,
      season_end_month: ingredient.seasonEndMonth,
      peak_start_month: ingredient.peakStartMonth,
      peak_end_month: ingredient.peakEndMonth,
      description_no: ingredient.descriptionNo,
      description_en: ingredient.descriptionEn,
      season_note_no: ingredient.seasonNoteNo,
      season_note_en: ingredient.seasonNoteEn,
      source_name: ingredient.sourceName,
      source_url: ingredient.sourceUrl,
      source_note: ingredient.sourceNote,
      verified_at: ingredient.verifiedAt,
      sort_order: index,
    }));

    const { error: ingredientsError } = await supabase.from("seasonal_ingredients").insert(payload);
    if (ingredientsError) {
      throw new Error(
        `Kunne ikke seede sesongråvarer for ${season.slug}: ${ingredientsError.message} (er migrasjon 0016_season_ingredient_richness.sql kjørt i Supabase?)`,
      );
    }
    ingredientCount += ingredientsForSeason.length;
  }

  console.log(`Ferdig! Seedet ${seasonSlugToId.size} sesonger og ${ingredientCount} sesongråvarer.`);
}

main().catch((err) => {
  console.error("\nSeeding feilet:", err instanceof Error ? err.message : err);
  process.exit(1);
});
