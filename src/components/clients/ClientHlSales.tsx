"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type HlSale = {
  id: string;
  partnerName: string;
  totalValue: string;
  totalQuantity: string;
  import: {
    periodFrom: string;
    periodTo: string;
  };
  items: Array<{ article: string; value: string; quantity: string }>;
};

function formatMoney(v: string) {
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(v));
}

function formatPeriod(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  return `${new Date(from).toLocaleDateString("bs-BA", opts)} – ${new Date(to).toLocaleDateString("bs-BA", opts)}`;
}

export function ClientHlSales({
  clientId,
  hlSalesPath = "/dashboard/manager/hl-sales",
}: {
  clientId: string;
  hlSalesPath?: string;
}) {
  const [sales, setSales] = useState<HlSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clients/${clientId}/hl-sales`);
        if (res.ok) {
          const data = await res.json();
          setSales(data.sales ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">HL prodaja</h2>
        </div>
        <div className="p-6 flex justify-center">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  const latest = sales[0];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">HL prodaja</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Rekapitulacija preko Hercegovina lijek
          </p>
        </div>
        <Link
          href={hlSalesPath}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Svi izvještaji →
        </Link>
      </div>

      <div className="p-6">
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nema uvezenih HL podataka za ovu apoteku (apoteka nije uparena u izvještaju).
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium text-slate-600">Period: </span>
              {formatPeriod(latest.import.periodFrom, latest.import.periodTo)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Vrijednost
                </span>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {formatMoney(latest.totalValue)} KM
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Količina
                </span>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {formatMoney(latest.totalQuantity)}
                </p>
              </div>
            </div>
            {latest.items.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-600 mb-2">Artikli</p>
                <ul className="text-sm text-slate-700 space-y-2 max-h-40 overflow-y-auto">
                  {latest.items.slice(0, 10).map((it, i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-3 border-b border-slate-50 pb-2 last:border-0"
                    >
                      <span className="line-clamp-2 flex-1">{it.article}</span>
                      <span className="text-slate-600 shrink-0 tabular-nums">
                        {formatMoney(it.value)} KM
                      </span>
                    </li>
                  ))}
                  {latest.items.length > 10 && (
                    <li className="text-xs text-slate-500 pt-1">
                      + još {latest.items.length - 10} artikala
                    </li>
                  )}
                </ul>
              </div>
            )}
            {sales.length > 1 && (
              <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                U sustavu je još {sales.length - 1} ranijih perioda — pogledaj u HL prodaji.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
