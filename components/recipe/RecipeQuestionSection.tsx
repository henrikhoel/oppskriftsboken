"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { IngredientGroup, RecipeStep } from "@/lib/types";
import { answerRecipeQuestion } from "@/lib/actions/kitchen-intelligence";
import { t, type Lang } from "@/lib/i18n";

interface RecipeQuestionContext {
  title: string;
  description: string;
  ingredientGroups: IngredientGroup[];
  steps: RecipeStep[];
  tips?: string | null;
}

/**
 * "LURER DU PÅ NOE?" – fritt spørsmål om DENNE oppskriften, se
 * answerRecipeQuestion i lib/actions/kitchen-intelligence.ts (ønsket av
 * Henrik 27.08.2026, eksempel: "Kan jeg lage pannebrødet først og la det
 * ligge klart på benken under håndkle?"). Bevisst enkel ett-spørsmål-
 * ett-svar-flate (samme "spør på forespørsel, IKKE en løpende samtale"-
 * prinsipp som WineSection.tsx sin vinanbefaling) – ALDRI en chat-boble/
 * meldingstråd-estetikk, det bryter med appens redaksjonelle, ikke-AI-
 * dashboard-aktige linje. Ett spørsmål, ett svar, som en liten leksikon-
 * oppslag rett i teksten.
 */
export function RecipeQuestionSection({
  recipeId,
  recipeContext,
  lang,
}: {
  recipeId: string;
  recipeContext: RecipeQuestionContext;
  lang: Lang;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answeredQuestion, setAnsweredQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await answerRecipeQuestion(recipeId, recipeContext, trimmed, lang);
        setAnswer(result);
        setAnsweredQuestion(trimmed);
      } catch (err) {
        setAnswer(null);
        setError(err instanceof Error ? err.message : t(lang, "recipeQuestion.error"));
      }
    });
  }

  function handleAskAnother() {
    setAnswer(null);
    setAnsweredQuestion(null);
    setError(null);
    setQuestion("");
  }

  return (
    <div className="mt-6 rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "recipeQuestion.title")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "recipeQuestion.desc")}</p>

      {!answer && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          {/* text-base (16px) på mobil, ikke text-sm – samme iOS Safari
           * auto-zoom-fiks som WineSection.tsx sitt vin-navn-felt. */}
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t(lang, "recipeQuestion.placeholder")}
            className="w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:flex-1 sm:text-sm"
          />
          <button
            type="submit"
            disabled={isPending || !question.trim()}
            className="shrink-0 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
          >
            {isPending ? t(lang, "recipeQuestion.asking") : t(lang, "recipeQuestion.ask")}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {answer && (
        <div className="mt-3 rounded-xl border border-line bg-paper px-4 py-3">
          {answeredQuestion && <p className="text-sm font-medium text-ink">{answeredQuestion}</p>}
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{answer}</p>
          <button
            type="button"
            onClick={handleAskAnother}
            className="mt-2 text-xs font-medium text-clay hover:text-clay-dark"
          >
            {t(lang, "recipeQuestion.askAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
