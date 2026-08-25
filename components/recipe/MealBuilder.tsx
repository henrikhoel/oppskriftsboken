"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  generateMealPlan,
  regenerateMealPlanCourse,
  type MealPlanCourse,
} from "@/lib/actions/kitchen-intelligence";
import { generateMealId, useMealSession, useMealSessionIndex } from "@/lib/hooks/useMealSession";
import { ALL_MEAL_COURSE_ROLES, type MealCourseRole } from "@/lib/kitchen-intelligence";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { t, type Lang } from "@/lib/i18n";

interface WorkingCourse {
  course: MealPlanCourse;
  servings: number;
  /** true mens "Foreslå en annen" pågår for AKKURAT denne plassen – lar
   * resten av menyen forbli interaktiv mens ett kort venter. */
  regenerating: boolean;
}

/**
 * MENYBYGGEREN (Fase 5 – Experience). Knapp-trigget (samme mønster som
 * MenuSuggestions/WineSection) – besøkende ber selv om en meny fremfor at
 * den lastes automatisk. Se generateMealPlan i
 * lib/actions/kitchen-intelligence.ts for selve AI-logikken, og
 * lib/kitchen-intelligence/meal-session.ts for hva som skjer med et
 * akseptert forslag når "Lagre menyen" trykkes – IKKE en utvidelse av
 * MenuSuggestions (den lever videre uendret ved siden av denne), men en
 * egen, rikere funksjon: rolle-inndelt, redigerbar per plass, og kan
 * inkludere retter som ikke finnes i katalogen ennå.
 */
export function MealBuilder({
  recipe,
  lang,
}: {
  recipe: {
    id: string;
    slug: string;
    title: string;
    description: string;
    servings: number;
    category: { name: string } | null;
  };
  lang: Lang;
}) {
  const router = useRouter();
  const [mealId] = useState(() => generateMealId());
  const { addExisting, addSuggested, setTitle } = useMealSession(mealId, recipe.title);
  const { addToIndex } = useMealSessionIndex();

  const [anchorRole, setAnchorRole] = useState<MealCourseRole | null>(null);
  const [menuTitle, setMenuTitle] = useState("");
  const [anchorServings, setAnchorServings] = useState(recipe.servings);
  const [courses, setCourses] = useState<WorkingCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasPlan = anchorRole !== null;

  async function handleBuild() {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateMealPlan(
        recipe.id,
        { title: recipe.title, description: recipe.description, categoryName: recipe.category?.name ?? null },
        lang,
      );
      setAnchorRole(plan.anchorRole);
      setMenuTitle(plan.menuTitle);
      setAnchorServings(recipe.servings);
      setCourses(plan.courses.map((course) => ({ course, servings: recipe.servings, regenerating: false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "mealBuilder.error"));
    } finally {
      setLoading(false);
    }
  }

  function removeCourse(role: MealCourseRole) {
    setCourses((prev) => prev.filter((c) => c.course.role !== role));
  }

  function setCourseServings(role: MealCourseRole, servings: number) {
    setCourses((prev) => prev.map((c) => (c.course.role === role ? { ...c, servings } : c)));
  }

  async function handleRegenerate(role: MealCourseRole) {
    setCourses((prev) => prev.map((c) => (c.course.role === role ? { ...c, regenerating: true } : c)));
    try {
      const excludeRecipeIds = [
        recipe.id,
        ...courses.flatMap((c) => (c.course.source === "existing" ? [c.course.recipe.id] : [])),
      ];
      const next = await regenerateMealPlanCourse(role, { title: recipe.title, description: recipe.description }, excludeRecipeIds, lang);
      setCourses((prev) => prev.map((c) => (c.course.role === role ? { course: next, servings: c.servings, regenerating: false } : c)));
    } catch {
      setCourses((prev) => prev.map((c) => (c.course.role === role ? { ...c, regenerating: false } : c)));
    }
  }

  async function handleSave() {
    if (!anchorRole) return;
    setSaving(true);
    try {
      setTitle(menuTitle || recipe.title);
      addExisting(anchorRole, { id: recipe.id, slug: recipe.slug, title: recipe.title }, anchorServings);
      for (const { course, servings } of courses) {
        if (course.source === "existing") {
          addExisting(course.role, { id: course.recipe.id, slug: course.recipe.slug, title: course.recipe.title }, servings);
        } else {
          addSuggested(course.role, { title: course.title, description: course.description }, servings);
        }
      }
      addToIndex(mealId);
      setSaved(true);
      router.push(`/meny/${mealId}`);
    } finally {
      setSaving(false);
    }
  }

  const displayRoles = anchorRole
    ? ALL_MEAL_COURSE_ROLES.filter((role) => role === anchorRole || courses.some((c) => c.course.role === role))
    : [];

  return (
    <div className="mt-10 rounded-card border border-line bg-cream-dark/60 p-5 sm:p-6">
      <h3 className="font-serif text-lg text-ink">{t(lang, "mealBuilder.heading")}</h3>
      <p className="mt-1 text-sm text-ink-faint">{t(lang, "mealBuilder.intro")}</p>

      {!hasPlan && (
        <button
          type="button"
          onClick={handleBuild}
          disabled={loading}
          className="mt-3 rounded-xl bg-clay px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {loading ? t(lang, "mealBuilder.loading") : t(lang, "mealBuilder.button")}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-clay-dark">{error}</p>}

      {hasPlan && (
        <div className="mt-5 space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t(lang, "mealBuilder.titleLabel")}
            </label>
            <input
              type="text"
              value={menuTitle}
              onChange={(e) => setMenuTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {displayRoles.map((role) => {
              if (role === anchorRole) {
                return (
                  <div key={role} className="flex flex-col gap-2 rounded-xl border border-line bg-cream p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-clay-dark">
                        {t(lang, `mealBuilder.role.${role}`)}
                      </span>
                      <Badge tone="clay">{t(lang, "mealBuilder.anchorBadge")}</Badge>
                    </div>
                    <p className="font-serif text-base text-ink">{recipe.title}</p>
                    <ServingsInput
                      value={anchorServings}
                      onChange={setAnchorServings}
                      lang={lang}
                    />
                  </div>
                );
              }

              const working = courses.find((c) => c.course.role === role);
              if (!working) return null;
              return (
                <CourseCard
                  key={role}
                  role={role}
                  working={working}
                  lang={lang}
                  onRemove={() => removeCourse(role)}
                  onRegenerate={() => handleRegenerate(role)}
                  onServingsChange={(servings) => setCourseServings(role, servings)}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} variant="primary" size="sm">
              {saving ? t(lang, "mealBuilder.saving") : t(lang, "mealBuilder.save")}
            </Button>
            {saved && (
              <Button href={`/meny/${mealId}`} variant="outline" size="sm">
                {t(lang, "mealBuilder.viewSaved")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseCard({
  role,
  working,
  lang,
  onRemove,
  onRegenerate,
  onServingsChange,
}: {
  role: MealCourseRole;
  working: WorkingCourse;
  lang: Lang;
  onRemove: () => void;
  onRegenerate: () => void;
  onServingsChange: (servings: number) => void;
}) {
  const { course, regenerating } = working;
  const title = course.source === "existing" ? course.recipe.title : course.title;

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-xl border border-line bg-cream p-4 transition-opacity",
        regenerating && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {t(lang, `mealBuilder.role.${role}`)}
        </span>
        <Badge tone={course.source === "existing" ? "olive" : "mustard"}>
          {course.source === "existing" ? t(lang, "mealBuilder.existingBadge") : t(lang, "mealBuilder.suggestedBadge")}
        </Badge>
      </div>

      <p className="font-serif text-base text-ink">{title}</p>
      {course.source === "suggested" && course.description && (
        <p className="text-xs leading-relaxed text-ink-faint">{course.description}</p>
      )}
      {course.note && <p className="text-xs italic leading-relaxed text-ink-faint">{course.note}</p>}

      <ServingsInput value={working.servings} onChange={onServingsChange} lang={lang} />

      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed"
        >
          {regenerating ? t(lang, "mealBuilder.regenerating") : t(lang, "mealBuilder.regenerate")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={regenerating}
          className="rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-dark disabled:cursor-not-allowed"
        >
          {t(lang, "mealBuilder.remove")}
        </button>
      </div>
    </div>
  );
}

function ServingsInput({
  value,
  onChange,
  lang,
}: {
  value: number;
  onChange: (value: number) => void;
  lang: Lang;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-faint">
      {t(lang, "mealBuilder.servingsLabel")}
      <input
        type="number"
        min={1}
        max={50}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next) && next >= 1) onChange(Math.round(next));
        }}
        className="w-16 rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink focus:border-clay focus:outline-none"
      />
    </label>
  );
}
