import type { Guide, GuideStep } from "@/lib/types";

/**
 * Samme "no/en med fallback til norsk"-mønster som localizedTitle/
 * localizedDescription/localizedCategoryName i lib/utils/format.ts, bare
 * for "Hvordan gjør jeg det?"-guidenes egne felter (intro/quickAnswerLines/
 * tips/warnings/steg). localizedTitle og localizedCategoryName fra
 * format.ts kan brukes DIREKTE på en guide/guide.category uten en egen
 * variant her – de bryr seg kun om title/titleEn og name/nameEn, som guider
 * allerede har i samme form.
 */

export function localizedGuideIntro(guide: Pick<Guide, "intro" | "introEn">, lang: "no" | "en" = "no"): string {
  return lang === "en" && guide.introEn ? guide.introEn : guide.intro;
}

export function localizedQuickAnswerLines(
  guide: Pick<Guide, "quickAnswerLines" | "quickAnswerLinesEn">,
  lang: "no" | "en" = "no",
): string[] {
  if (lang === "en" && guide.quickAnswerLinesEn.length > 0) return guide.quickAnswerLinesEn;
  return guide.quickAnswerLines;
}

export function localizedGuideTips(guide: Pick<Guide, "tips" | "tipsEn">, lang: "no" | "en" = "no"): string[] {
  if (lang === "en" && guide.tipsEn.length > 0) return guide.tipsEn;
  return guide.tips;
}

export function localizedGuideWarnings(
  guide: Pick<Guide, "warnings" | "warningsEn">,
  lang: "no" | "en" = "no",
): string[] {
  if (lang === "en" && guide.warningsEn.length > 0) return guide.warningsEn;
  return guide.warnings;
}

export function localizedStepText(step: Pick<GuideStep, "text" | "textEn">, lang: "no" | "en" = "no"): string {
  return lang === "en" && step.textEn ? step.textEn : step.text;
}

export function localizedStepNote(step: Pick<GuideStep, "note" | "noteEn">, lang: "no" | "en" = "no"): string | null {
  return lang === "en" && step.noteEn ? step.noteEn : step.note;
}
