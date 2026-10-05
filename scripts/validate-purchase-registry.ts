/**
 * Validerer kjøpsnormaliseringsregisteret (lib/utils/purchase-registry-data.ts
 * + lib/utils/purchase-engine.ts) mot de FAKTISKE, nåværende oppskriftsdataene
 * i prosjektet (ingredient-audit-data.json, eksportert fra selve databasen),
 * IKKE bare den historiske auditen spesifikasjonen selv bygger på.
 *
 * Kjører HVER faktiske ingredienslinje i HVER publiserte oppskrift gjennom
 * resolvePurchaseLine, og rapporterer alt som ikke er en kjent, "normal"
 * kjøpsvare – uten å gjette eller utvide reglene selv (Henriks eksplisitte
 * instruks: "ikke gjett og ikke utvid reglene på egen hånd ... rapporter
 * funnet til meg").
 *
 * Kjøres med: npx tsx scripts/validate-purchase-registry.ts
 */
import { readFileSync } from "fs";
import { resolvePurchaseLine } from "../lib/utils/purchase-engine";

interface RawItem {
  name: string;
  note: string | null;
  unit: string | null;
  amount: string | null;
}
interface RawGroup {
  ingredient_items: RawItem[];
}
interface RawRecipe {
  slug: string;
  title: string;
  is_published: boolean;
  ingredient_groups: RawGroup[];
}

const data: RawRecipe[] = JSON.parse(readFileSync("ingredient-audit-data.json", "utf-8"));

let totalItems = 0;
let totalRecipes = 0;
const kindCounts: Record<string, number> = {};
const flagged = new Map<
  string,
  { kind: string; reviewReason?: string; purchaseId: string | null; count: number; examples: Set<string> }
>();

for (const recipe of data) {
  if (!recipe.is_published) continue;
  totalRecipes++;
  for (const group of recipe.ingredient_groups ?? []) {
    for (const item of group.ingredient_items ?? []) {
      totalItems++;
      const resolved = resolvePurchaseLine(item.name, item.note, item.unit);
      kindCounts[resolved.kind] = (kindCounts[resolved.kind] ?? 0) + 1;

      if (resolved.kind === "review" || resolved.kind === "unknown") {
        const key = `${resolved.kind}::${item.name.trim().toLowerCase()}::${(item.note ?? "").trim().toLowerCase()}::${(item.unit ?? "").trim().toLowerCase()}`;
        const existing = flagged.get(key);
        const exampleText = `${item.amount ?? ""} ${item.unit ?? ""} ${item.name}${item.note ? ` (${item.note})` : ""} — «${recipe.title}» (${recipe.slug})`.trim();
        if (existing) {
          existing.count++;
          if (existing.examples.size < 3) existing.examples.add(exampleText);
        } else {
          flagged.set(key, {
            kind: resolved.kind,
            reviewReason: resolved.reviewReason,
            purchaseId: resolved.purchaseId,
            count: 1,
            examples: new Set([exampleText]),
          });
        }
      }
    }
  }
}

console.log(`=== Validering mot faktiske produksjonsdata (${totalRecipes} publiserte oppskrifter, ${totalItems} ingredienslinjer) ===\n`);
console.log("Fordeling per resolvePurchaseLine-kind:");
for (const [kind, count] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kind}: ${count}`);
}

const flaggedList = [...flagged.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`\n=== ${flaggedList.length} unike (navn/notat/enhet)-kombinasjoner flagget som REVIEW eller UNKNOWN ===`);
console.log("(dette er IKKE feil i seg selv for 'review' – mange er spesifikasjonens egne, tiltenkte REVIEW-rader. 'unknown' betyr ingen alias traff i det hele tatt.)\n");

for (const [, info] of flaggedList) {
  console.log(
    `[${info.kind}${info.reviewReason ? `/${info.reviewReason}` : ""}]${info.purchaseId ? ` -> ${info.purchaseId}` : ""} (${info.count}x)`,
  );
  for (const ex of info.examples) console.log(`    ${ex}`);
}
