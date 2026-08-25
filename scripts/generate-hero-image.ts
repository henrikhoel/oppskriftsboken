/**
 * Genererer et nytt hero-bakgrunnsbilde til forsiden – et mørkt, elegant
 * stemningsbilde (levende lys, gulltoner, dyp skygge) som matcher À
 * TABLE-uttrykket – og lagrer det som public/images/hero.png.
 *
 * Kjøres med: npm run generate:hero
 *
 * Krever OPENAI_API_KEY i .env.local (samme separate nøkkel som "Generer
 * AI-bilde" i admin bruker – se .env.example). Trygt å kjøre på nytt for
 * å få et nytt forslag; filen overskrives.
 */
import { config as loadEnv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateHeroImageBase64 } from "../lib/ai/openai";

loadEnv({ path: ".env.local" });

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "Mangler OPENAI_API_KEY i .env.local. Se .env.example – dette er en egen nøkkel fra platform.openai.com.",
    );
    process.exit(1);
  }

  console.log("Genererer hero-bilde med OpenAI …");
  const b64 = await generateHeroImageBase64();
  const bytes = Buffer.from(b64, "base64");

  const outDir = path.join(process.cwd(), "public", "images");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "hero.png");
  await writeFile(outPath, bytes);

  console.log(`Ferdig! Lagret til ${outPath}`);
  console.log("Last forsiden på nytt (npm run dev) for å se det nye bildet.");
}

main().catch((err) => {
  console.error("Klarte ikke å generere hero-bildet:", err instanceof Error ? err.message : err);
  process.exit(1);
});
