-- ─────────────────────────────────────────────────────────────────────────
-- "I DETTE STEGET" i Cook Mode (07.10.2026). Henrik: man skal ikke måtte
-- åpne hele ingredienslisten for å sjekke mengder mens man lager mat – hvert
-- steg i Cook Mode skal vise NØYAKTIG hvilke ingredienser (med mengde) som
-- faktisk brukes i akkurat det steget.
--
-- Lagt til som en egen kolonne på recipe_steps: en liste av
-- ingredient_items.id-er dette steget bruker. BEVISST id-basert, ikke
-- navnebasert eller tekst-tolket fra selve steget (se filheaderen til
-- RecipeStep.ingredientItemIds i lib/types.ts for hele resonnementet – samme
-- ingrediensnavn kan forekomme flere ganger i én oppskrift med ulik mengde i
-- ulike steg, og kun en id-basert lenke kan peke til riktig linje).
--
-- INGEN fremmednøkkel-constraint mot ingredient_items: lib/actions/recipes.ts
-- sin writeRecipeChildren() lagrer hele oppskriften ved å SLETTE og sette inn
-- alle barne-rader på nytt (ingen ekte databasetransaksjon i supabase-js, se
-- kommentaren der) – en FK ville brutt midt i den operasjonen. id-ene er i
-- stedet stabile over tid fordi writeRecipeChildren nå bevisst bruker den
-- STABILE klientsidige id-en (FormIngredientItem.key, satt til den
-- eksisterende rad-id-en når en allerede lagret ingrediens redigeres) som
-- selve databasens id-kolonne ved innsetting, i stedet for å la databasen
-- generere en helt ny id ved HVERT lagre – ellers ville denne lenken blitt
-- stille brutt igjen ved neste redigering av oppskriften, selv uten noen
-- endring i selve ingredienslisten.
--
-- uuid[] (ikke text[]) – ingredient_items.id er uuid, og dette gir samme
-- type-sikkerhet som resten av skjemaet. default '{}' + not null: en
-- oppskrift uten noen lenker satt (alle eksisterende oppskrifter, til en
-- admin aktivt definerer dem) har da en tom liste, ikke null – slipper
-- null-sjekker i tillegg til tomme-liste-sjekker i appkoden.
--
-- Kjøres på samme måte som de foregående migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipe_steps
  add column if not exists ingredient_item_ids uuid[] not null default '{}'::uuid[];

comment on column public.recipe_steps.ingredient_item_ids is
  'Admin-definerte lenker til de ingredient_items.id-ene dette steget bruker, satt i components/admin/StepsEditor.tsx ("Ingredienser i dette steget"). Styrer "I DETTE STEGET"-seksjonen i Cook Mode (CookMode.tsx) – se RecipeStep.ingredientItemIds i lib/types.ts. Tom liste = ingen lenker satt ennå, vis ingen seksjon.';
