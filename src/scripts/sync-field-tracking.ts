#!/usr/bin/env tsx
import "dotenv/config";
/**
 * Skripta za preuzimanje GPS podataka (NEX) i upis u bazu.
 * Pokreni na serveru kroz cron (npr. svakih 5 min) da podaci budu stalno
 * dostupni čak i ako niko nije na field-tracking stranici.
 *
 * Primjer crontab-a (svakih 5 min):
 *   0,5,10,15,20,25,30,35,40,45,50,55 * * * * cd /path/to/portalv2 && npm run cron:sync-field-tracking
 *
 * Ili ručno:
 *   npm run cron:sync-field-tracking
 */
import { syncFieldTrackingGps } from "@/lib/sync-field-tracking-gps";
import { prisma } from "@/lib/prisma";

const now = () => new Date().toISOString();

syncFieldTrackingGps()
  .then((r) => {
    console.log(
      `[${now()}] GPS sync OK: ${r.positionCount} pozicija, ${r.ignitionUpdated} ignition ažurirano`
    );
  })
  .catch((err) => {
    console.error(`[${now()}] GPS sync greška:`, err);
    process.exitCode = 1;
  })
  .finally(() => {
    prisma.$disconnect();
  });
