export type HlPartnerSaleItemParsed = {
  lineNo?: number;
  article: string;
  value: number;
  quantity: number;
};

export type HlPartnerSaleParsed = {
  partnerName: string;
  totalValue: number;
  totalQuantity: number;
  items: HlPartnerSaleItemParsed[];
};

export type ParsedHlSales = {
  periodFrom: Date;
  periodTo: Date;
  grandTotal: number;
  grandQuantity: number;
  partners: HlPartnerSaleParsed[];
};

function cellStr(row: unknown[], i: number): string {
  const v = row[i];
  if (v == null) return "";
  return String(v).trim();
}

function parseNumber(raw: string): number {
  const s = raw.replace(/\s/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized = s;
  if (hasComma && hasDot) {
    normalized = s.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    normalized = s.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseHlDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractPeriodFromRows(rows: unknown[][]): { from: Date; to: Date } | null {
  const dates: Date[] = [];
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    for (const cell of rows[r]) {
      const s = String(cell ?? "").trim();
      if (!s) continue;
      const direct = parseHlDate(s);
      if (direct) {
        dates.push(direct);
        continue;
      }
      for (const token of s.split(/[,;]/)) {
        const d = parseHlDate(token.trim());
        if (d) dates.push(d);
      }
    }
  }
  if (dates.length >= 2) {
    const unique = [...new Map(dates.map((d) => [d.getTime(), d])).values()].sort(
      (a, b) => a.getTime() - b.getTime()
    );
    return { from: unique[0], to: unique[unique.length - 1] };
  }
  return null;
}

function isHeaderRow(row: unknown[]): boolean {
  const c0 = cellStr(row, 0).toLowerCase();
  return c0 === "r.br" || c0.includes("artikal");
}

function isGrandTotalRow(row: unknown[]): boolean {
  const c0 = cellStr(row, 0).toUpperCase().replace(/\s/g, "");
  const c1 = cellStr(row, 1);
  const c3 = cellStr(row, 3);
  return c0.includes("TOTAL") && !c1 && !!c3;
}

function isPartnerTotalRow(row: unknown[]): boolean {
  const c0 = cellStr(row, 0).toUpperCase().replace(/\s/g, "");
  const c1 = cellStr(row, 1);
  const c3 = cellStr(row, 3);
  return c0.includes("TOTAL") && !!c1 && !!c3;
}

function isLineItemRow(row: unknown[]): boolean {
  const c0 = cellStr(row, 0);
  return /^\d+$/.test(c0) && !!cellStr(row, 1);
}

function isSectionHeaderRow(row: unknown[]): boolean {
  const name = cellStr(row, 0);
  if (!name || isLineItemRow(row) || isPartnerTotalRow(row) || isGrandTotalRow(row)) {
    return false;
  }
  const c3 = cellStr(row, 3);
  return !c3;
}

export function parseHlSalesRows(rows: unknown[][]): ParsedHlSales {
  const period = extractPeriodFromRows(rows);
  if (!period) {
    throw new Error(
      "Nije moguće pročitati period iz Excela (očekivani datumi npr. 6/1/26, 6/3/26 u zaglavlju)."
    );
  }

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (isHeaderRow(rows[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error('Nije pronađen red zaglavlja (R.br, Artikal, Kupac...).');
  }

  let grandTotal = 0;
  let grandQuantity = 0;
  const partners: HlPartnerSaleParsed[] = [];
  let current: HlPartnerSaleParsed | null = null;

  const flushCurrent = () => {
    if (current && current.items.length > 0) {
      partners.push(current);
    }
    current = null;
  };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

    if (isGrandTotalRow(row)) {
      flushCurrent();
      grandTotal = parseNumber(cellStr(row, 3));
      grandQuantity = parseNumber(cellStr(row, 4));
      continue;
    }

    if (isPartnerTotalRow(row)) {
      const partnerName = cellStr(row, 1);
      const totalValue = parseNumber(cellStr(row, 3));
      const totalQuantity = parseNumber(cellStr(row, 4));
      if (current && current.partnerName === partnerName) {
        current.totalValue = totalValue;
        current.totalQuantity = totalQuantity;
        partners.push(current);
        current = null;
      } else {
        flushCurrent();
        partners.push({
          partnerName,
          totalValue,
          totalQuantity,
          items: [],
        });
      }
      continue;
    }

    if (isSectionHeaderRow(row)) {
      flushCurrent();
      current = {
        partnerName: cellStr(row, 0),
        totalValue: 0,
        totalQuantity: 0,
        items: [],
      };
      continue;
    }

    if (isLineItemRow(row)) {
      const partnerName: string =
        cellStr(row, 2) || current?.partnerName || "";
      if (!partnerName) continue;

      if (!current || current.partnerName !== partnerName) {
        flushCurrent();
        current = {
          partnerName,
          totalValue: 0,
          totalQuantity: 0,
          items: [],
        };
      }

      current.items.push({
        lineNo: parseInt(cellStr(row, 0), 10) || undefined,
        article: cellStr(row, 1),
        value: parseNumber(cellStr(row, 3)),
        quantity: parseNumber(cellStr(row, 4)),
      });
    }
  }

  flushCurrent();

  if (partners.length === 0) {
    throw new Error("Nije pronađen nijedan partner u izvještaju.");
  }

  return {
    periodFrom: period.from,
    periodTo: period.to,
    grandTotal,
    grandQuantity,
    partners,
  };
}
