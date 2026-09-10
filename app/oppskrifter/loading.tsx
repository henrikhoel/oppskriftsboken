import { RecipeCardSkeleton } from "@/components/ui/Skeleton";

// Flyttet hit fra app/loading.tsx (10.09.2026, "fortsatt like treig"-
// tilbakemeldingen – se filheaderen der som ble stående som forklaring en
// liten stund, nå fjernet siden selve filen er flyttet).
//
// app/loading.tsx lå tidligere på ROTEN av app/-mappen, som i Next.js sin
// mappekonvensjon betyr at den ble brukt som Suspense-fallback for
// BOKSTAVELIG TALT hver eneste side på hele nettstedet – ikke bare
// oppskrift-listen den faktisk ligner på. Bekreftet direkte mot den
// publiserte siden: rå HTML-responsen for forsiden (GET /) inneholdt
// nettopp DETTE rutenettet av 8 pulserende oppskrift-kort som første
// utflatede innhold, før den ekte forsiden (hero, "Husets favoritter" osv.)
// ble byttet inn client-side – helt feil form for en side uten noe
// kortrutenett i det hele tatt. Samme feil skjedde på oppskriftsiden
// (viste et rutenett med kort i stedet for selve retten) og – verst av alt,
// siden forsiden gjør flest datakall av noen side – nettopp når man trykker
// C-ikonet for å gå tilbake dit, som var den mest konkrete tilbakemeldingen.
//
// Denne filen brukes nå KUN som fallback for /oppskrifter (se
// app/oppskrifter/page.tsx), der den faktisk matcher innholdet som kommer.
// Ingen loading.tsx lenger på roten – uten en side-spesifikk match viser
// Next.js nå rett og slett den forrige siden helt til den nye er klar
// (pluss sin egne innebygde topplinje-fremdriftsindikator), i stedet for
// et feil, forvirrende "hopp" til et helt annet skjelett midt i
// navigasjonen.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
