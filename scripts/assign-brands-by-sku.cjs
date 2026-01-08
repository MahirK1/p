// scripts/assign-brands-by-sku.cjs
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mapiranje prvih 4 cifara SKU-a na brandove
const SKU_TO_BRAND_MAP = {
  "0101": "Medex",
  "1401": "Avent",
  "3401": "Clearblue",
  "3901": "Yasenka",
  "4301": "Ice Power",
  "2701": "Mölnlycke",
  "0503": "Santex",
  "0520": "Šprice i igle",
  "5001": "ImunoFarma",
  "1651": "Belleli",
  "1678": "Free2Play",
  "1679": "FreeON",
  "0521": "Šprice i igle",
  "1699": "Minikoioi",
};

async function main() {
  console.log("🚀 Počinje dodjela brandova na osnovu SKU-a...\n");

  // Uzmi sve proizvode
  const products = await prisma.product.findMany({
    include: { brand: true },
  });

  console.log(`📦 Pronađeno ${products.length} proizvoda\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const brandIds = {};

  // Prvo kreiramo ili pronalazimo sve brandove
  for (const [skuPrefix, brandName] of Object.entries(SKU_TO_BRAND_MAP)) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: {
        name: brandName,
      },
    });
    brandIds[skuPrefix] = brand.id;
    console.log(`✅ Brand "${brandName}" (${skuPrefix}): ID ${brand.id}`);
  }

  console.log("\n📝 Ažuriranje proizvoda...\n");

  // Zatim ažuriramo proizvode
  for (const product of products) {
    try {
      // Uzmi prva 4 znaka SKU-a
      const skuPrefix = product.sku.substring(0, 4);

      // Provjeri da li postoji mapiranje za ovaj prefix
      if (!SKU_TO_BRAND_MAP[skuPrefix]) {
        console.log(
          `⏭️  Preskočeno: ${product.name} (SKU: ${product.sku}) - nema mapiranja za prefix "${skuPrefix}"`
        );
        skipped++;
        continue;
      }

      // Provjeri da li proizvod već ima ispravan brand
      const expectedBrandId = brandIds[skuPrefix];
      if (product.brandId === expectedBrandId) {
        console.log(
          `✓ Već postavljeno: ${product.name} (SKU: ${product.sku}) -> ${SKU_TO_BRAND_MAP[skuPrefix]}`
        );
        continue;
      }

      // Ažuriraj proizvod
      await prisma.product.update({
        where: { id: product.id },
        data: { brandId: expectedBrandId },
      });

      console.log(
        `✅ Ažurirano: ${product.name} (SKU: ${product.sku}) -> ${SKU_TO_BRAND_MAP[skuPrefix]}`
      );
      updated++;
    } catch (error) {
      console.error(
        `❌ Greška pri ažuriranju proizvoda ${product.name} (SKU: ${product.sku}):`,
        error.message
      );
      errors++;
    }
  }

  console.log("\n📊 Rezultati:");
  console.log(`   ✅ Ažurirano: ${updated}`);
  console.log(`   ⏭️  Preskočeno: ${skipped}`);
  console.log(`   ❌ Greške: ${errors}`);
  console.log("\n✨ Završeno!");
}

main()
  .catch((e) => {
    console.error("❌ Kritična greška:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
