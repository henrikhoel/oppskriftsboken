import Link from "next/link";
import type { Guide } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { GuideStepsList } from "@/components/guide/GuideStepsList";
import { ClockIcon, GaugeIcon } from "@/components/ui/icons";
import {
  difficultyLabel,
  formatMinutesRange,
  localizedCategoryName,
  localizedTitle,
} from "@/lib/utils/format";
import {
  localizedGuideIntro,
  localizedGuideTips,
  localizedGuideWarnings,
  localizedQuickAnswerLines,
} from "@/lib/utils/guide-format";
import { t, type Lang } from "@/lib/i18n";

/**
 * Selve guide-INNHOLDET (tittel → kort svar → nummererte steg → tips/pass
 * på → relatert) – bevisst rendret av EN komponent uavhengig av
 * app/hvordan-gjor-jeg-det/[slug]/page.tsx sin egen sideramme (ingen
 * hero-bilde/tilbake-lenke her), nettopp slik at akkurat denne komponenten
 * senere kan gjenbrukes UENDRET inne i en fremtidig Cook Mode-sheet/overlay
 * (spesifikasjon: "guide-komponenter må være klare til å vises både som
 * egen side OG som et Cook Mode-innslag"). Ingen client-tilstand her – ren
 * presentasjon, så den fungerer like fint som server-rendret sideinnhold nå
 * som senere inni en client-rendret Cook Mode-komponent.
 */
export function GuideContent({ guide, lang = "no" }: { guide: Guide; lang?: Lang }) {
  const quickAnswer = localizedQuickAnswerLines(guide, lang);
  const tips = localizedGuideTips(guide, lang);
  const warnings = localizedGuideWarnings(guide, lang);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {guide.category && (
            <Link href={`/hvordan-gjor-jeg-det/kategori/${guide.category.slug}`}>
              <Badge tone="olive">{localizedCategoryName(guide.category, lang)}</Badge>
            </Link>
          )}
          {guide.isDemo && <Badge tone="mustard">{t(lang, "guides.demoBadge")}</Badge>}
        </div>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">{localizedTitle(guide, lang)}</h1>
        <p className="max-w-2xl text-ink-soft">{localizedGuideIntro(guide, lang)}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-faint">
          {(guide.estimatedTimeMinutes != null || guide.estimatedTimeMinutesMax != null) && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              {formatMinutesRange(guide.estimatedTimeMinutes, guide.estimatedTimeMinutesMax, lang)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <GaugeIcon className="h-4 w-4" />
            {difficultyLabel(guide.difficulty, lang)}
          </span>
        </div>
      </header>

      {quickAnswer.length > 0 && (
        <div className="rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
          <h2 className="font-serif text-base text-ink">{t(lang, "guide.quickAnswerHeading")}</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {quickAnswer.map((line, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink-soft">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.steps.length > 0 && (
        <div>
          <h2 className="mb-5 font-serif text-lg text-ink">{t(lang, "guide.stepsHeading")}</h2>
          <GuideStepsList steps={guide.steps} lang={lang} />
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-clay">
            {t(lang, "guide.tipsHeading")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink-soft">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* "Pass på" er bevisst nøktern typografi (understreket overskrift,
       * ikke bakgrunnsfarge/ikon-boks) – spesifikasjonens eksplisitte krav
       * om IKKE en stor gul varselboks. */}
      {warnings.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
            {t(lang, "guide.warningsHeading")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {warnings.map((warning, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink-soft">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.relatedGuides.length > 0 && (
        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">{t(lang, "guide.relatedHeading")}</h2>
          <div className="flex flex-wrap gap-2.5">
            {guide.relatedGuides.map((related) => (
              <Link
                key={related.id}
                href={`/hvordan-gjor-jeg-det/${related.slug}`}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-clay/40 hover:text-clay-dark"
              >
                {localizedTitle(related, lang)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
