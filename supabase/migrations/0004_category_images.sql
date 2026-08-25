-- Legger til én kolonne: et valgfritt bilde-URL for hver kategori (Pizza,
-- Pasta, osv.), satt fra admin -> Kategorier. Brukes av CategoryShowcase på
-- forsiden ("Bla etter kategori") i stedet for den deterministiske
-- gull/oliven-gradienten som vises når en kategori ikke har eget bilde ennå.
--
-- Ingen ny storage-bucket nødvendig – kategori-bilder lastes opp til den
-- samme offentlige "recipe-images"-bucketen som oppskriftsbilder (se
-- 0001_init.sql), bare med et eget "categories/"-filnavn-prefiks. Samme
-- policyer (public read, admin write) gjelder derfor automatisk.
--
-- Kjøres på samme måte som de tidligere migrasjonene: lim hele filen inn i
-- Supabase-dashbordet → SQL Editor → Run.

alter table public.categories
  add column if not exists image_url text;

comment on column public.categories.image_url is
  'Valgfritt bilde for kategoriflisen på forsiden (CategoryShowcase). Null = vis en av de faste gradient-fallbackene i stedet.';
