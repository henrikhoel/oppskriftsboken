import Image from "next/image";
import { SEASON_HERO_IMAGES } from "@/lib/season-images";

/**
 * (05.10.2026, se filheaderen til lib/season-images.ts) Sesongens eget
 * bakgrunnsbilde øverst på "I sesong"-siden – samme full-bredde
 * hero-mønster som er etablert for Ukesmeny og "I kjøleskapet"
 * (absolutt posisjonert bak innholdet, -z-10, parent trenger `isolate`
 * for riktig stacking-context – se filheaderen til app/hva-kan-jeg-lage/
 * page.tsx for hvorfor `isolate` er nødvendig der en forelder også har
 * `bg-black`).
 *
 * Henriks eksplisitte ønske (05.10.2026, så høstbildet første gang):
 * "det må blendes inn på en måte sånn at det ikke blir støyete med
 * skriften [...] blur? og litt mørkt overlay". Løst med TRE lag over
 * selve bildet: et mykt blur PÅ bildet selv (ikke bare et overlegg – et
 * skarpt skogbilde med mye små detaljer/grener blir uansett visuell støy
 * bak tekst, uansett hvor mørkt overlegget er), en flat mørk
 * overlay (ensartet lesbarhet over HELE bildeflaten, ikke kun der
 * gradienten treffer), og til slutt samme bunn-gradient-til-svart-teknikk
 * som resten av appen – slik at heroen smelter sømløst over i sidens
 * vanlige sorte bakgrunn i stedet for å få en hard kant. `scale-110` på
 * selve bildet kompenserer for at `blur` sprer pikslene ut over kantene
 * (ellers vises en utydelig lys stripe i ytterkanten av boksen).
 *
 * Boksen er kort og bred (380–540px høy, full bredde), så object-cover
 * beskjærer et SMALT, bredt vindu midt i hvert kildebilde (de er alle
 * liggende, ~4:3). Default er senter-beskjæring, men enkelte bilder har
 * sitt mest dekkende/fargeriktige parti et annet sted (se `position` i
 * SEASON_HERO_IMAGES sin filheader for eksempler – vår og sommer) – da
 * styres selve CSS object-position per bilde i stedet for å endre
 * mørklegging/blur, som ikke hjelper på et feil utsnitt.
 *
 * Returnerer null for enhver sesong som ennå ikke har fått sitt bilde
 * (se SEASON_HERO_IMAGES) – siden ser da ut akkurat som FØR denne
 * funksjonen fantes, helt uendret layout. Dette er bevisst slik at
 * utrulling kan skje bilde for bilde etter hvert som Henrik sender dem,
 * uten noen mellomstate med "ødelagt"/manglende bilde.
 */
export function SeasonHeroImage({ slug }: { slug: string }) {
  const image = SEASON_HERO_IMAGES[slug];
  if (!image) return null;

  return (
    <div
      className="absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden sm:h-[460px] lg:h-[540px]"
      aria-hidden="true"
    >
      <Image
        src={image.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-110 object-cover blur-[6px]"
        style={{ objectPosition: image.position ?? "center" }}
      />
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 55%, #000 90%, #000 100%)",
        }}
      />
    </div>
  );
}
