-- ─────────────────────────────────────────────────────────────────────────
-- "Roller" for oppskrifter – bygget 27.09.2026 etter ønske fra Henrik, som
-- en direkte parallell til "Humør" (migrasjon 0020_recipe_mood.sql): "når
-- man velger en egen meny, så skal man velge forrett, hovedrett, dessert,
-- tilbehør osv. når man da trykker på en av dem, så gir det mening at det
-- kun er oppskrifter i de kategoriene som kommer opp, så man ikke kan
-- velge brownie til forrett og rundstykker til dessert. da må dette også
-- være noe jeg som admin kan velge, på lik måte som humør... og her også
-- kan det jo hende at flere passer i flere kategorier, så samme
-- utforming som humør tror jeg er bra her."
--
-- Erstatter IKKE inferCourseRoleFromCategory (lib/kitchen-intelligence/
-- meal-session.ts) – den brukes fortsatt til å plassere ANKERRETTEN i den
-- AI-baserte menybyggeren (MealBuilder.tsx/generateMealPlan), et separat
-- og bevisst uendret flow. Dette feltet brukes KUN til å filtrere
-- retteVELGEREN i den manuelle menybyggeren (ManualMealBuilder.tsx), der
-- kategori-gjetting ikke er godt nok ("man ikke kan velge brownie til
-- forrett") – akkurat samme begrunnelse som humør fikk et eget admin-satt
-- felt i stedet for å stole på en heuristikk.
--
-- courses <@ ARRAY[...] – gyldige verdier er de fire faste rollene som
-- allerede finnes i lib/kitchen-intelligence/types.ts sin MealCourseRole
-- (ALL_MEAL_COURSE_ROLES i meal-session.ts), IKKE et nytt navnerom – samme
-- fire verdier brukes fra før i menybyggerens rutenett (forrett/hovedrett/
-- tilbehør/dessert), så CHECK-constrainten holdes manuelt i synk med DEN,
-- ikke med en ny fil. NOT NULL DEFAULT '{}' (ikke NULL) av samme grunn som
-- moods: tom liste UTTRYKKER allerede "ikke plassert i noen rolle ennå".
-- ─────────────────────────────────────────────────────────────────────────

alter table public.recipes add column if not exists courses text[] not null default '{}';

alter table public.recipes add constraint recipes_courses_check
  check (courses <@ array['starter', 'main', 'side', 'dessert']::text[]);

comment on column public.recipes.courses is
  'Admin-satte menyroller (forrett/hovedrett/tilbehør/dessert, se MealCourseRole i lib/kitchen-intelligence/types.ts) som styrer hvilke oppskrifter som vises som valg for en gitt rolle i den manuelle menybyggeren (components/meal/ManualMealBuilder.tsx), satt fra /admin/roller (se RolePicker.tsx). En oppskrift kan stå i flere roller samtidig (f.eks. en salat som både forrett og tilbehør). Tom liste (default) = ikke plassert i noen rolle, vises da ikke som valg for noen av dem. Helt separat fra inferCourseRoleFromCategory, som fortsatt brukes uendret til å plassere ankerretten i den AI-baserte menybyggeren.';
