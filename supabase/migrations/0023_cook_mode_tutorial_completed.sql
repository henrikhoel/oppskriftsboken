-- ─────────────────────────────────────────────────────────────────────────
-- Cook Mode-tutorial: "ikke vis denne igjen" (29.09.2026) – Henrik: "denne
-- tutorialen også dukker opp første gang man går inn via en oppskrift ...
-- da kan det være nyttig at man kan huke av for at den ikke skal vises
-- igjen, og at dette huskes på profilen." Én ny boolsk kolonne på den
-- eksisterende profiles-tabellen (samme mønster som is_admin) – ingen ny
-- tabell, ingen RLS-endring nødvendig siden profiles allerede har egne
-- policyer for at en bruker kun kan lese/skrive sin egen rad.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column cook_mode_tutorial_completed boolean not null default false;

comment on column public.profiles.cook_mode_tutorial_completed is
  'Satt til true når brukeren huker av "ikke vis denne igjen" i Cook Mode-tutorialen (se lib/actions/cook-mode-tutorial.ts). Når true hopper Cook Mode-tutorialen automatisk over ved fremtidige besøk i en ekte oppskrifts Cook Mode – "Utforsk Cook Mode"-siden (/cook-mode) tilbyr fortsatt å vise den på nytt på forespørsel.';
