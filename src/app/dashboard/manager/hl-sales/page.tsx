"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ImportSummary = {
  id: string;
  periodFrom: string;
  periodTo: string;
  grandTotal: string;
  grandQuantity: string;
  fileName: string | null;
  importedAt: string;
  _count: { partnerSales: number };
};

type PartnerSale = {
  id: string;
  partnerName: string;
  totalValue: string;
  totalQuantity: string;
  clientId: string | null;
  client: { id: string; name: string; city: string | null } | null;
  items: Array<{
    id: string;
    lineNo: number | null;
    article: string;
    value: string;
    quantity: string;
  }>;
};

type ImportDetail = {
  id: string;
  periodFrom: string;
  periodTo: string;
  grandTotal: string;
  grandQuantity: string;
  fileName: string | null;
  partnerSales: PartnerSale[];
};

function formatMoney(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPeriod(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  return `${f.toLocaleDateString("bs-BA", opts)} – ${t.toLocaleDateString("bs-BA", opts)}`;
}

export default function HlSalesPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canUpload = role === "ADMIN" || role === "MANAGER";
  const clientBasePath =
    role === "ADMIN"
      ? "/dashboard/admin/clients"
      : role === "COMMERCIAL"
        ? "/dashboard/commercial/clients"
        : "/dashboard/manager/clients";
  const { showToast } = useToast();

  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterMatch, setFilterMatch] = useState<"all" | "matched" | "unmatched">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadImports = async () => {
    const res = await fetch("/api/hl-sales");
    if (!res.ok) throw new Error("load imports");
    const data = await res.json();
    return data.imports as ImportSummary[];
  };

  const loadDetail = useCallback(async () => {
    if (!selectedImportId) return;
    setLoadingDetail(true);
    try {
      const params = new URLSearchParams({ importId: selectedImportId });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterMatch === "matched") params.set("onlyMatched", "1");
      if (filterMatch === "unmatched") params.set("onlyUnmatched", "1");
      const res = await fetch(`/api/hl-sales?${params}`);
      if (!res.ok) throw new Error("load detail");
      const data = await res.json();
      setDetail(data);
    } catch {
      showToast("Greška pri učitavanju prodaje.", "error");
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedImportId, debouncedSearch, filterMatch, showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await loadImports();
        setImports(list);
        if (list.length > 0 && !selectedImportId) {
          setSelectedImportId(list[0].id);
        }
      } catch {
        showToast("Greška pri učitavanju izvještaja.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/hl-sales", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Greška pri uvozu.", "error");
        return;
      }
      showToast(
        `Uvezeno ${data.partnersCount} partnera (${data.matchedClients} upareno s portalom).` +
          (data.replaced ? " Postojeći period je zamijenjen." : ""),
        "success"
      );
      const list = await loadImports();
      setImports(list);
      setSelectedImportId(data.importId);
      if (data.unmatchedPartners?.length > 0) {
        console.warn("Neupareni partneri:", data.unmatchedPartners);
      }
    } catch {
      showToast("Greška pri uploadu.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const selectedSummary = imports.find((i) => i.id === selectedImportId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">HL prodaja po partnerima</h1>
          <p className="text-sm text-slate-500">
            Rekapitulacija prodaje preko Hercegovina lijek — uporedba s apotekama na portalu.
          </p>
        </div>
        {canUpload && (
          <label
            className={classNames(
              "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition",
              uploading ? "bg-green-400 cursor-wait" : "bg-green-600 hover:bg-green-500"
            )}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" />
                Uvozim...
              </>
            ) : (
              "📤 Uvezi Excel (HL)"
            )}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={uploading}
              onChange={onUpload}
            />
          </label>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <LoadingSpinner size="md" />
        </div>
      ) : imports.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-sm text-slate-600">
          Još nema uvezenih izvještaja.
          {canUpload ? (
            <p className="mt-2">
              Klikni <strong>Uvezi Excel (HL)</strong> i odaberi fajl tipa
              „Rekapitulacija prodaje po partnerima“.
            </p>
          ) : (
            <p className="mt-2">Obrati se administratoru za uvoz.</p>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 flex flex-wrap gap-3 items-center">
            <label className="text-sm text-slate-600">Period:</label>
            <select
              value={selectedImportId}
              onChange={(e) => setSelectedImportId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[220px]"
            >
              {imports.map((imp) => (
                <option key={imp.id} value={imp.id}>
                  {formatPeriod(imp.periodFrom, imp.periodTo)}
                  {imp.fileName ? ` (${imp.fileName})` : ""}
                </option>
              ))}
            </select>
            {selectedSummary && (
              <span className="text-sm text-slate-500">
                Ukupno: <strong>{formatMoney(selectedSummary.grandTotal)}</strong> KM ·{" "}
                {selectedSummary._count.partnerSales} partnera
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 flex flex-wrap gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pretraga partnera (apoteka)..."
                className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={filterMatch}
                onChange={(e) =>
                  setFilterMatch(e.target.value as "all" | "matched" | "unmatched")
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Svi partneri</option>
                <option value="matched">Samo upareni s portalom</option>
                <option value="unmatched">Samo neupareni</option>
              </select>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="md" />
              </div>
            ) : !detail?.partnerSales.length ? (
              <div className="p-6 text-sm text-slate-500">Nema rezultata za filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Partner (HL)</th>
                      <th className="px-4 py-3 text-left">Portal klijent</th>
                      <th className="px-4 py-3 text-right">Vrijednost</th>
                      <th className="px-4 py-3 text-right">Količina</th>
                      <th className="px-4 py-3 text-right">Stavke</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.partnerSales.map((ps) => (
                      <Fragment key={ps.id}>
                        <tr
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-xs">
                            {ps.partnerName}
                          </td>
                          <td className="px-4 py-3">
                            {ps.client ? (
                              <Link
                                href={`${clientBasePath}/${ps.client.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {ps.client.name}
                                {ps.client.city ? ` (${ps.client.city})` : ""}
                              </Link>
                            ) : (
                              <span className="text-amber-600 text-xs">Nije upareno</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatMoney(ps.totalValue)} KM
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(ps.totalQuantity)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="text-blue-600 text-xs hover:underline"
                              onClick={() =>
                                setExpandedId(expandedId === ps.id ? null : ps.id)
                              }
                            >
                              {expandedId === ps.id ? "Sakrij" : `${ps.items.length} ▼`}
                            </button>
                          </td>
                        </tr>
                        {expandedId === ps.id && (
                          <tr key={`${ps.id}-items`} className="bg-slate-50/80">
                            <td colSpan={5} className="px-4 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="text-left py-1 pr-2">#</th>
                                    <th className="text-left py-1">Artikal</th>
                                    <th className="text-right py-1">Vrijednost</th>
                                    <th className="text-right py-1">Kol.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ps.items.map((it) => (
                                    <tr key={it.id} className="border-t border-slate-200/60">
                                      <td className="py-1 pr-2">{it.lineNo ?? "—"}</td>
                                      <td className="py-1">{it.article}</td>
                                      <td className="py-1 text-right">
                                        {formatMoney(it.value)} KM
                                      </td>
                                      <td className="py-1 text-right">
                                        {formatMoney(it.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
