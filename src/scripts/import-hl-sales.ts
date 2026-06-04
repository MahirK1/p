/**
 * Uvoz HL rekapitulacije iz Excela:
 * npx tsx src/scripts/import-hl-sales.ts "C:\path\to\file.xlsx"
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { importHlSalesFromBuffer } from "@/lib/import-hl-sales";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Korištenje: npx tsx src/scripts/import-hl-sales.ts "putanja\\fajl.xlsx"');
    process.exit(1);
  }

  const abs = resolve(filePath);
  const buffer = readFileSync(abs);
  const result = await importHlSalesFromBuffer(buffer, abs.split(/[/\\]/).pop());

  console.log("✅ Uvoz završen");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
