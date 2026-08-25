# Oppskriftsboken

En personlig, redaksjonell digital kokebok bygget med Next.js (App Router), TypeScript, Tailwind CSS og Supabase. Varmt, rolig og luftig design – tenkt som en kokebok du faktisk bruker over tid, ikke en oppskriftsblogg.

Nettsiden fungerer **helt uten Supabase konfigurert** ("demo-modus") – den viser da 8 eksempeloppskrifter fra `lib/demo-data/`, slik at du kan se og teste hele designet umiddelbart. Admin-panelet krever derimot Supabase, siden det trenger en ekte database og innlogging.

## Innhold

1. [Kom raskt i gang (demo-modus)](#1-kom-raskt-i-gang-demo-modus)
2. [Arkitektur](#2-arkitektur)
3. [Full oppsett med Supabase](#3-full-oppsett-med-supabase)
4. [Kjøre lokalt](#4-kjøre-lokalt)
5. [Deploy til Vercel](#5-deploy-til-vercel)
6. [Eget domene](#6-eget-domene)
7. [Vanlige oppgaver](#7-vanlige-oppgaver)
8. [Feilsøking](#8-feilsøking)

---

## 1. Kom raskt i gang (demo-modus)

Forutsetter Node.js 20.9 eller nyere.

```bash
npm install
npm run dev
```

Åpne <http://localhost:3000>. Du vil se en svart informasjonslinje øverst som forteller at siden kjører i demo-modus – dette er forventet inntil du kobler til Supabase (steg 3).

## 2. Arkitektur

```
app/                        Next.js App Router
  page.tsx                  Forside (hero, utvalgte, kategorier, nyeste, favoritter)
  oppskrifter/               Bla gjennom + søk/filter
    [slug]/                  Oppskriftsside (ingredienser, fremgangsmåte, Cook Mode)
  kategori/[slug]/           Kategorisider
  favoritter/                Favoritter (admin: database, gjest: nettleser)
  handleliste/                Handleliste (nettleser)
  admin/
    login/                    Innlogging (utenfor tilgangssjekken)
    (dashboard)/              Alt bak innlogging – beskyttet av layout.tsx
      page.tsx                 Liste over oppskrifter, publiser/avpubliser, slett
      oppskrifter/ny/           Opprett oppskrift
      oppskrifter/[id]/         Rediger oppskrift
      kategorier/               Administrer kategorier
  sitemap.ts, robots.ts       SEO

components/                  React-komponenter, gruppert etter domene
  ui/                         Knapper, ikoner, skeletons, tomme tilstander
  layout/                     Header, footer, mobil bunnmeny, demo-banner
  recipe/                     Kort, ingrediensliste, Cook Mode, porsjonsvelger
  search/                     Søkefelt, filterpanel
  shopping/                   Handleliste-visning
  admin/                      Skjema, bildeopplasting, ingrediens-/steg-editor

lib/
  config.ts                  ÉN fil for navn, farger, favicon-initial, metadata
  types.ts                   Domenetyper (Recipe, Category, osv.)
  supabase/                  Klienter for browser/server/middleware/admin (service-role)
  data/                      Datatilgang – leser fra Supabase ELLER demo-data automatisk
  actions/                   Server Actions – all skriving (oppretting/redigering/sletting)
  validation/                Zod-skjemaer, kjøres server-side før noe lagres
  demo-data/                 8 eksempeloppskrifter + kategorier (TypeScript, ikke SQL)
  hooks/                     localStorage-hooker (favoritter, handleliste, Cook Mode, wake lock)
  utils/                     Slug, porsjonsskalering, søk/filter, handleliste-sammenslåing, SEO

supabase/migrations/          SQL-skjema, RLS-policyer, Storage-bucket
scripts/seed.ts               Seeder Supabase med samme data som demo-modus bruker
types/database.types.ts       Håndskrevne typer som speiler databaseskjemaet
```

**Hvordan demo-modus fungerer:** `lib/supabase/is-configured.ts` sjekker om `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` er satt. Alt i `lib/data/` sjekker denne flagget og leser fra `lib/demo-data/` i stedet for Supabase når den er `false`. Ingen `cookies()`/database-kall skjer i det hele tatt i demo-modus, så siden kan bygges og kjøres helt uten miljøvariabler.

**Sikkerhet:** Alle skriveoperasjoner (`lib/actions/*.ts`) er Server Actions merket `"use server"`, og hver eneste en starter med `await requireAdmin()` som slår opp brukerens sesjon på serveren og sjekker `profiles.is_admin` i databasen. Dette gjelder uansett hva som skjer i UI – ingen skriveoperasjon stoler på at brukeren "kom seg forbi" en frontend-sjekk. I tillegg håndhever Row Level Security-policyene i `supabase/migrations/0001_init.sql` det samme kravet direkte i databasen, som en ekstra sikkerhetsbarriere selv om det skulle finnes en feil i applikasjonskoden.

## 3. Full oppsett med Supabase

### 3.1 Opprett Supabase-prosjekt

1. Gå til [supabase.com](https://supabase.com) og opprett en gratis konto/organisasjon.
2. Klikk **New project**, gi det et navn (f.eks. "oppskriftsboken"), velg et databasepassord og en region nær deg.
3. Vent til prosjektet er klart (tar vanligvis 1–2 minutter).

### 3.2 Kjør database-migrasjonen

1. Åpne prosjektet i Supabase-dashbordet → **SQL Editor**.
2. Opprett en ny spørring, lim inn hele innholdet fra [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), og kjør den.
3. Dette oppretter alle tabeller, indekser, RLS-policyer og en Storage-bucket kalt `recipe-images` (offentlig lesbar, kun admin kan skrive).

Foretrekker du Supabase CLI fremfor SQL Editor: `supabase link` og deretter `supabase db push` fungerer også, siden filen ligger i standard `supabase/migrations/`-mappen.

### 3.3 Hent API-nøklene dine

I Supabase-dashbordet: **Project Settings → API**.

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (under "Project API keys", markert hemmelig) → `SUPABASE_SERVICE_ROLE_KEY`

> Nyere Supabase-prosjekter kan kalle disse "publishable key" og "secret key" i stedet for "anon key"/"service_role key" – det er de samme to nøklene, bare med nytt navn i grensesnittet.

### 3.4 Sett opp miljøvariabler

```bash
cp .env.example .env.local
```

Fyll inn `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=recipe-images
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` lastes automatisk av Next.js og skal **aldri** committes (den ligger allerede i `.gitignore`). `SUPABASE_SERVICE_ROLE_KEY` brukes kun av `scripts/seed.ts` som kjører lokalt på din maskin – den sendes aldri til nettleseren.

### 3.5 Last inn eksempeloppskriftene (valgfritt, men anbefalt)

```bash
npm run seed
```

Dette fyller databasen din med de samme 8 eksempeloppskriftene og kategoriene som demo-modus viser, så du har noe å øve på med det samme. Trygt å kjøre flere ganger.

### 3.6 Opprett admin-bruker

1. I Supabase-dashbordet: **Authentication → Users → Add user**. Sett en e-post og et passord du husker.
2. Gå til **Table Editor → profiles**. Du skal se en rad med samme `id` som brukeren du nettopp opprettet (den lages automatisk).
3. Rediger raden og sett `is_admin` til `true`.
4. Start dev-serveren (`npm run dev`), gå til `/admin/login`, og logg inn med e-posten og passordet fra steg 1.

## 4. Kjøre lokalt

```bash
npm install
npm run dev       # starter utviklingsserver på http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # TypeScript uten emit
npm run build      # produksjonsbygg
npm run start      # kjør produksjonsbygget lokalt
npm run seed       # seed Supabase med eksempeldata (krever .env.local)
```

## 5. Deploy til Vercel

1. Push prosjektet til et GitHub/GitLab/Bitbucket-repo.
2. Gå til [vercel.com](https://vercel.com) → **Add New Project** → velg repoet. Vercel kjenner igjen Next.js automatisk, ingen build-konfigurasjon trengs.
3. Under **Environment Variables**, legg inn de samme variablene som i `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (kun nødvendig dersom du vil kunne kjøre seed-scriptet mot produksjonsdatabasen fra et annet sted – trengs ikke for at selve nettsiden skal fungere)
   - `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_SITE_URL` → sett til din faktiske Vercel-URL (f.eks. `https://oppskriftsboken.vercel.app`), oppdater igjen når du kobler på eget domene
4. Klikk **Deploy**.

## 6. Eget domene

1. I Vercel-prosjektet: **Settings → Domains** → legg til domenet ditt.
2. Følg Vercels instruksjoner for å peke DNS-en fra domeneleverandøren din til Vercel (enten ved å flytte nameservers, eller legge til en CNAME/A-record).
3. Oppdater `NEXT_PUBLIC_SITE_URL` i Vercels miljøvariabler til det nye domenet, og re-deploy (Vercel → Deployments → … → Redeploy) slik at SEO-metadata og sitemap bruker riktig URL.

## 7. Vanlige oppgaver

**Endre navn, farger eller favicon-initial:** Rediger `lib/config.ts` (navn, tagline, favicon-initial) og fargetokens i `app/globals.css` (`@theme`-blokken). Selve favicon-/OG-bildefilene ligger i `app/icon.png`, `app/apple-icon.png` og `public/og-image.jpg` – bytt dem ut med egne bilder når du har dem.

**Legge til en ny kategori:** `/admin/kategorier`, eller direkte i `categories`-tabellen i Supabase.

**Opprette/redigere en oppskrift:** `/admin` → "Ny oppskrift", eller klikk en eksisterende for å redigere. Ingredienser og steg kan legges til, slettes og flyttes opp/ned med pilknappene (se "Antakelser" nedenfor for hvorfor det ble pil-knapper og ikke dra-og-slipp).

**Endre hvilke oppskrifter som vises som "utvalgt" på forsiden:** Huk av "Vis som utvalgt på forsiden" i redigeringsskjemaet.

## 8. Feilsøking

**"Admin er utilgjengelig i demo-modus"** – du mangler `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` i `.env.local`. Se steg 3.

**Innlogging fungerer, men jeg får "Ingen admin-tilgang"** – du har logget inn med en gyldig bruker, men `is_admin` er ikke satt til `true` for den brukeren i `profiles`-tabellen. Se steg 3.6.

**Bilder laster ikke opp** – sjekk at migrasjonen i steg 3.2 faktisk kjørte (den oppretter `recipe-images`-bucketen og storage-policyene). Sjekk også at du er logget inn som admin.

**Supabase svarer ikke / er nede** – sidene har innebygde feil- og tomme-tilstander (`app/error.tsx`, `EmptyState`-komponenten) i stedet for å krasje. Prøv igjen-knappen laster siden på nytt.

---

## Antakelser og valg som ble tatt

Oppgaven ba om at gode valg skulle tas selv uten å stoppe for avklaringer. Her er de mest sentrale:

- **Ingen drag-and-drop for sortering av ingredienser/steg.** I stedet er det pil-opp/pil-ned-knapper. Dette er fullt tilgjengelig med tastatur, fungerer pålitelig på touch, og unngår avhengighet til et ekstra drag-and-drop-bibliotek som ikke kunne testes i utviklingsmiljøet dette prosjektet ble bygget i.
- **Admin-favoritter lagres i databasen** (`recipes.favorited_by_admin`), siden det kun er én administrator. **Gjeste-favoritter lagres i nettleserens localStorage** og er derfor personlige for hver enhet/nettleser, slik oppgaven åpnet for.
- **Bilder:** Eksempeloppskriftene bruker genererte, lisensfrie illustrasjonsbilder (varme fargeoverganger med et matrelatert symbol) i stedet for ekte fotografier, for å unngå usikkerhet rundt bilderettigheter. Bytt dem gjerne ut med egne bilder via admin-panelet.
- **Stack-versjoner:** Next.js 16.x, React 19.x, Tailwind CSS 4.x, TypeScript 5.7. `package.json` bruker `^`-versjoner slik at `npm install` henter nyeste kompatible patch-/minor-versjon når du installerer.
- **Én administrator:** Datamodellen (`profiles.is_admin`) støtter i prinsippet flere administratorer, men admin-UI-et er bygget og testet for én bruker, slik oppgaven beskriver ("jeg", "meg").

## Hva fungerer fullt ut

- Forside, søk/filtrering, kategori- og oppskriftssider, Cook Mode med Wake Lock og fremdrift, porsjonsskalering med pene brøker, handleliste med sammenslåing, favoritter (database + localStorage), fullt admin-CRUD med bildeopplasting til Supabase Storage, Recipe JSON-LD, sitemap/robots, RLS-beskyttet database, demo-modus uten Supabase.

## Hva du må konfigurere selv

- Et Supabase-prosjekt (steg 3).
- Din egen admin-bruker (steg 3.6).
- Eget domene i Vercel, dersom ønskelig (steg 6).
- Bytt ut placeholder-bildene og branding i `lib/config.ts` med dine egne, når du har dem klare.
