import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import {
  parseHlSalesRows,
  type ParsedHlSales,
} from "@/lib/parse-hl-sales-xlsx";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ClientForMatch = {
  id: string;
  name: string;
  branches: { name: string }[];
};

export function matchClientId(
  partnerName: string,
  clients: ClientForMatch[]
): string | null {
  const normPartner = normalizeName(partnerName);
  if (!normPartner) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const client of clients) {
    const candidates = [
      client.name,
      ...client.branches.map((b) => b.name),
    ];
    for (const cand of candidates) {
      const normCand = normalizeName(cand);
      if (!normCand) continue;
      if (normPartner === normCand) return client.id;
      if (
        normPartner.includes(normCand) ||
        normCand.includes(normPartner)
      ) {
        const score = Math.min(normPartner.length, normCand.length);
        if (score > bestScore) {
          bestScore = score;
          bestId = client.id;
        }
      }
    }
  }

  return bestId;
}

export function parseHlSalesBuffer(buffer: Buffer): ParsedHlSales {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return parseHlSalesRows(rows);
}

export type ImportHlSalesResult = {
  importId: string;
  periodFrom: string;
  periodTo: string;
  partnersCount: number;
  matchedClients: number;
  unmatchedPartners: string[];
  grandTotal: number;
  replaced: boolean;
};

export async function importHlSalesFromParsed(
  parsed: ParsedHlSales,
  fileName?: string
): Promise<ImportHlSalesResult> {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      branches: { select: { name: true } },
    },
  });

  const existing = await prisma.hlSalesImport.findUnique({
    where: {
      periodFrom_periodTo: {
        periodFrom: parsed.periodFrom,
        periodTo: parsed.periodTo,
      },
    },
  });

  const unmatched: string[] = [];
  let matched = 0;

  const importRecord = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.hlSalesImport.delete({ where: { id: existing.id } });
    }

    const imp = await tx.hlSalesImport.create({
      data: {
        periodFrom: parsed.periodFrom,
        periodTo: parsed.periodTo,
        grandTotal: parsed.grandTotal,
        grandQuantity: parsed.grandQuantity,
        fileName: fileName ?? null,
      },
    });

    for (const partner of parsed.partners) {
      const clientId = matchClientId(partner.partnerName, clients);
      if (clientId) matched++;
      else unmatched.push(partner.partnerName);

      await tx.hlPartnerSale.create({
        data: {
          importId: imp.id,
          partnerName: partner.partnerName,
          clientId,
          totalValue: partner.totalValue,
          totalQuantity: partner.totalQuantity,
          items: {
            create: partner.items.map((item) => ({
              lineNo: item.lineNo ?? null,
              article: item.article,
              value: item.value,
              quantity: item.quantity,
            })),
          },
        },
      });
    }

    return imp;
  });

  return {
    importId: importRecord.id,
    periodFrom: parsed.periodFrom.toISOString(),
    periodTo: parsed.periodTo.toISOString(),
    partnersCount: parsed.partners.length,
    matchedClients: matched,
    unmatchedPartners: unmatched,
    grandTotal: parsed.grandTotal,
    replaced: !!existing,
  };
}

export async function importHlSalesFromBuffer(
  buffer: Buffer,
  fileName?: string
): Promise<ImportHlSalesResult> {
  const parsed = parseHlSalesBuffer(buffer);
  return importHlSalesFromParsed(parsed, fileName);
}
