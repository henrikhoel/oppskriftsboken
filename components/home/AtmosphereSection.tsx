import { siteConfig } from "@/lib/config";
import { ParallaxBackdrop } from "@/components/home/ParallaxBackdrop";
import { t, type Lang } from "@/lib/i18n";

/**
 * Ren stemnings-/merkevareseksjon mellom de funksjonelle delene – ingen
 * knapper, ingen data, kun ordmerket og slagordet igjen over et stort
 * stemningsbilde (se public/images/atmosphere.jpg).
 */
export function AtmosphereSection({ lang }: { lang: Lang }) {
  return (
    // Kakestabelen i originalbildet sitter litt venstre for midten, med rent
    // mørkt (nesten svart) bakteppe både lengst til venstre OG lengst til
    // høyre. Fra sm: og opp flankerer vi derfor kaken: À TABLE helt til
    // venstre (i den rene bakteppe-sonen, før vase/flaske-rekvisittene
    // begynner rundt ~30% inn i bildet), tagline-linjen til høyre (samme
    // plassering som før) – kaken selv står fritt i midten, urørt av tekst.
    // På mobil (for smalt til at en flankering gir albuerom) beholdes
    // original stablet, sentrert tekst som før.
    <section className="relative isolate flex h-[55vh] min-h-[380px] flex-col items-center justify-center gap-3 overflow-hidden sm:flex-row sm:justify-between sm:gap-0">
      {/* objectPosition "center 66%" er tunet for det nåværende bildet
       * (kakestabelen) – motivet sitter i nedre del av bildet, og
       * seksjonen her er lav og bred, så en ren senter-beskjæring kuttet
       * bort mesteparten av kaken. Juster tallet (eller fjern propen for
       * å gå tilbake til "center") neste gang bildet byttes ut. */}
      <ParallaxBackdrop src="/images/atmosphere.jpg" alt="" objectPosition="center 66%" />
      <div className="absolute inset-0 bg-black/60" />
      <p className="relative px-4 text-center font-serif text-4xl tracking-tight text-ink sm:px-0 sm:ml-16 sm:text-left sm:text-5xl lg:ml-28">
        {siteConfig.name}
      </p>
      <p className="relative px-4 text-center font-serif text-base italic text-clay-dark sm:px-0 sm:mr-12 sm:text-right sm:text-lg lg:mr-24">
        {t(lang, "home.atmosphere.tagline")}
      </p>
    </section>
  );
}
