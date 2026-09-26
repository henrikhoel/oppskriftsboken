-- ─────────────────────────────────────────────────────────────────────────
-- Fellespassord for hele det offentlige nettstedet (26.09.2026, Henrik:
-- "med tanke på copyright og at dette per dags dato er en kokebok for folk
-- jeg kjenner, bør den egentlig være låst med brukernavn og passord?") –
-- landet på ETT delt passord for alle besøkende (ikke egne kontoer per
-- person), håndhevet i proxy.ts FØR siden i det hele tatt rendres. Se
-- filheaderen der, i lib/site-access/token.ts og i lib/actions/
-- site-access.ts for resten av bildet.
--
-- Passordet er IKKE hardkodet i koden – det ligger her i databasen
-- (bcrypt-hashet med pgcrypto, som allerede ble slått på i 0001_init.sql)
-- slik at admin kan bytte det senere fra /admin/innstillinger uten en ny
-- utrulling (eksplisitt ønsket: "det må også være noe admin skal kunne
-- fikse senere").
--
-- Selve verifiseringen skjer HELT inne i databasen via en SECURITY DEFINER
-- RPC-funksjon (verify_site_password) – IKKE via appens service-role-nøkkel
-- (som per filheaderen i lib/supabase/admin.ts aldri skal brukes fra vanlige
-- request-handlere, kun fra lokale scripts). RPC-en returnerer KUN
-- true/false, aldri selve hashen, og er derfor trygg å kalle med den
-- vanlige anon-nøkkelen fra besøkende som per definisjon ikke er innlogget
-- ennå på dette tidspunktet. Selve tabellen har RLS på UTEN noen policies i
-- det hele tatt – verken anon eller authenticated kan lese/skrive raden
-- direkte, ALL tilgang går via disse to funksjonene.
create table if not exists public.site_access (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

comment on table public.site_access is
  'Nøyaktig én rad – bcrypt-hashet fellespassord for hele det offentlige nettstedet. Se filheaderen i denne migrasjonen for begrunnelsen.';

alter table public.site_access enable row level security;

create or replace function public.verify_site_password(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select password_hash = crypt(candidate, password_hash) from public.site_access where id = true),
    false
  );
$$;

-- Kun admin kan kalle denne (dobbelt håndhevet – se requireAdmin()-kallet i
-- updateSitePassword i lib/actions/site-access.ts – men sjekket HER også,
-- siden RPC-er kan kalles direkte med anon/authenticated-nøkkelen utenom
-- appens egen kode). Bytter passordet ved å lagre en ny, tilfeldig saltet
-- bcrypt-hash.
create or replace function public.set_site_password(new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Ikke autorisert.';
  end if;

  update public.site_access
    set password_hash = crypt(new_password, gen_salt('bf')), updated_at = now()
    where id = true;
end;
$$;

grant execute on function public.verify_site_password(text) to anon, authenticated;
grant execute on function public.set_site_password(text) to authenticated;

-- Startpassord (Henrik, 26.09.2026): "convite2026" – bytt det når som helst
-- fra /admin/innstillinger senere. `on conflict do nothing` slik at denne
-- migrasjonen er trygg å kjøre på nytt uten å overskrive et passord admin
-- allerede har byttet til noe annet.
insert into public.site_access (id, password_hash)
values (true, crypt('convite2026', gen_salt('bf')))
on conflict (id) do nothing;
