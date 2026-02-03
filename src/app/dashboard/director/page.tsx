"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type DirectorAnalytics = {
  year: number;
  month: number;
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  visitsTotal: number;
  visitsPlanned: number;
  visitsDone: number;
  visitsCanceled: number;
  conversionRate: number;
  visitsWithOrders: number;
  previousPeriod: {
    totalSales: number;
    totalOrders: number;
    avgOrderValue: number;
    salesChange: number;
    ordersChange: number;
  };
  salesByDay: Array<{ date: string; amount: number }>;
  visitsByDay: Array<{ date: string; planned: number; done: number }>;
  salesByWeekday: Array<{ day: number; amount: number; orders: number; visits: number }>;
  salesByHour: Array<{ hour: number; amount: number; orders: number }>;
  salesByBrand: Array<{ brand: string; amount: number; orders: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    brand: string;
    quantity: number;
    amount: number;
    orders: number;
  }>;
  salesByCommercial: Array<{
    commercialId: string;
    commercial: string;
    amount: number;
    ordersCount: number;
    visitsCount: number;
    visitsDone: number;
    visitsWithOrders: number;
    avgOrderValue: number;
    avgDaysToOrder: number;
  }>;
  performanceRanking: Array<{
    commercialId: string;
    commercial: string;
    amount: number;
    ordersCount: number;
    visitsCount: number;
    visitsDone: number;
    visitsWithOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    visitCompletionRate: number;
    score: number;
    rank: number;
  }>;
  topClients: Array<{
    clientId: string;
    client: string;
    amount: number;
    ordersCount: number;
  }>;
  achievementByCommercial: Array<{
    commercialId: string;
    commercial: string;
    target: number;
    achieved: number;
    percentage: number;
  }>;
  // NOVE ANALITIKE
  trendAnalysis?: Array<{ month: number; year: number; sales: number; orders: number; visits: number }>;
  newVsExistingClients?: {
    newClients: number;
    newClientsCount: number;
    newClientsSales: number;
    existingClientsCount: number;
    existingClientsSales: number;
  };
  churnedClients?: Array<{
    clientId: string;
    client: string;
    lastOrderDate: Date | null;
    monthsSinceLastOrder: number;
  }>;
  cancellationReasons?: Array<{ reason: string; count: number }>;
  visitsWithoutOrders?: Array<{
    visitId: string;
    clientId: string;
    clientName: string;
    commercialId: string;
    commercialName: string;
    scheduledAt: Date;
    note: string | null;
  }>;
  // ANALITIKE SREDNJEG PRIORITETA
  customerLifetimeValue?: Array<{
    clientId: string;
    client: string;
    totalOrders: number;
    totalSales: number;
    firstOrderDate: Date;
    lastOrderDate: Date;
    avgOrderValue: number;
  }>;
  productsTrending?: {
    growing: Array<{
      productId: string;
      productName: string;
      brand: string;
      currentAmount: number;
      previousAmount: number;
      change: number;
      changePercent: number;
    }>;
    declining: Array<{
      productId: string;
      productName: string;
      brand: string;
      currentAmount: number;
      previousAmount: number;
      change: number;
      changePercent: number;
    }>;
  };
  commercialActivityHeatmap?: Array<{
    commercialId: string;
    commercial: string;
    activityByDate: Array<{ date: string; visits: number; orders: number; totalActivity: number }>;
  }>;
  kpiDashboard?: {
    sales: { current: number; target: number; achieved: number; percentage: number };
    orders: { current: number; target: number; achieved: number; percentage: number };
    visits: { current: number; target: number; achieved: number; percentage: number };
    conversion: { current: number; target: number; achieved: number; percentage: number };
  };
  funnelAnalysis?: {
    plannedVisits: number;
    doneVisits: number;
    visitsWithOrders: number;
    approvedOrders: number;
    completedOrders: number;
    conversionRates: {
      plannedToDone: number;
      doneToOrder: number;
      orderToApproved: number;
      approvedToCompleted: number;
    };
  };
};

type Commercial = {
  id: string;
  name: string;
};

export default function DirectorDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<DirectorAnalytics | null>(null);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCommercialId, setSelectedCommercialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "commercials" | "products" | "clients" | "advanced">("overview");

  const loadCommercials = async () => {
    try {
      const res = await fetch("/api/users?role=COMMERCIAL");
      if (res.ok) {
        const json = await res.json();
        setCommercials(json);
      }
    } catch (error) {
      console.error("Error loading commercials:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const url = `/api/analytics/director?year=${selectedYear}&month=${selectedMonth}${
        selectedCommercialId ? `&commercialId=${selectedCommercialId}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load analytics");
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error loading analytics:", error);
      showToast("Greška pri učitavanju analitike.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommercials();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, selectedCommercialId]);

  const filteredCommercials = useMemo(() => {
    if (!data || !data.salesByCommercial) {
      return [];
    }
    if (selectedCommercialId) {
      return data.salesByCommercial.filter((c) => c.commercialId === selectedCommercialId);
    }
    return data.salesByCommercial;
  }, [data?.salesByCommercial, selectedCommercialId]);

  const exportToCSV = () => {
    if (!data) return;

    const headers = ["Komercijalista", "Prodaja (KM)", "Narudžbe", "Posjete", "Završeno", "Konverzija (%)"];
    const rows = data.salesByCommercial.map((com) => [
      com.commercial,
      com.amount.toFixed(2),
      com.ordersCount.toString(),
      com.visitsCount.toString(),
      com.visitsDone.toString(),
      com.visitsDone > 0 ? ((com.visitsWithOrders / com.visitsDone) * 100).toFixed(1) : "0",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analitika_direktor_${selectedYear}_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const maxSalesDay = Math.max(...data.salesByDay.map((d) => d.amount), 1);
  const maxVisits = Math.max(
    ...data.visitsByDay.map((d) => Math.max(d.planned, d.done)),
    1
  );
  const maxBrandSales = Math.max(...data.salesByBrand.map((b) => b.amount), 1);
  const maxCommercialSales = Math.max(
    ...data.salesByCommercial.map((c) => c.amount),
    1
  );
  const maxProductSales = Math.max(...data.topProducts.map((p) => p.amount), 1);
  const maxWeekdaySales = Math.max(...data.salesByWeekday.map((d) => d.amount), 1);

  const monthNames = [
    "Januar", "Februar", "Mart", "April", "Maj", "Juni",
    "Juli", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
  ];

  const weekdayNames = ["Nedelja", "Ponedeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard - Analitika</h1>
          <p className="text-sm text-slate-500">
            Detaljna analiza rada komercijale na terenu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCommercialId || ""}
            onChange={(e) => setSelectedCommercialId(e.target.value || null)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Svi komercijalisti</option>
            {commercials.map((com) => (
              <option key={com.id} value={com.id}>
                {com.name}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {monthNames.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            min={2020}
            max={2030}
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={exportToCSV}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "overview", label: "Pregled" },
          { id: "commercials", label: "Komercijalisti" },
          { id: "products", label: "Proizvodi" },
          { id: "clients", label: "Klijenti" },
          { id: "advanced", label: "Napredno" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-500 text-emerald-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ukupna prodaja</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.totalSales.toFixed(2)} KM
          </p>
          <div className="mt-1 flex items-center gap-2">
            {data.previousPeriod.salesChange !== 0 && (
              <span
                className={`text-xs ${
                  data.previousPeriod.salesChange > 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {data.previousPeriod.salesChange > 0 ? "↑" : "↓"}{" "}
                {Math.abs(data.previousPeriod.salesChange).toFixed(1)}%
              </span>
            )}
            <p className="text-xs text-slate-500">
              {data.totalOrders} narudžbi
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Prosječna vrijednost narudžbe
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.avgOrderValue.toFixed(2)} KM
          </p>
          {data.previousPeriod.avgOrderValue > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Prethodno: {data.previousPeriod.avgOrderValue.toFixed(2)} KM
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ukupno posjeta</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.visitsTotal}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.visitsDone} završeno, {data.visitsPlanned} planirano
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Konverzija posjeta</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.conversionRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.visitsWithOrders} posjeta sa narudžbom
          </p>
        </div>
      </div>

      {activeTab === "commercials" && data.achievementByCommercial.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Realizacija planova - Detaljno
            </h2>
          </div>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Komercijalista</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Ostvareno</th>
                  <th className="px-4 py-3 text-right">Postotak</th>
                  <th className="px-4 py-3 text-right">Preostalo</th>
                  <th className="px-4 py-3 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.achievementByCommercial.map((ach, idx) => (
                  <tr
                    key={`${ach.commercialId}-${idx}`}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {ach.commercial}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {ach.target.toFixed(2)} KM
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {ach.achieved.toFixed(2)} KM
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          ach.percentage >= 100
                            ? "bg-emerald-100 text-emerald-700"
                            : ach.percentage >= 80
                            ? "bg-blue-100 text-blue-700"
                            : ach.percentage >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ach.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Math.max(0, ach.target - ach.achieved).toFixed(2)} KM
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ach.percentage >= 100 ? (
                        <span className="text-emerald-600">✓ Postignuto</span>
                      ) : ach.percentage >= 80 ? (
                        <span className="text-blue-600">→ Blizu</span>
                      ) : (
                        <span className="text-amber-600">⚠ U toku</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dodaj ostale tabove slično kao u manager dashboardu */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Prodaja po danima
            </h2>
            <div className="space-y-2">
              {data.salesByDay.length === 0 ? (
                <p className="text-sm text-slate-500">Nema prodaje u ovom periodu.</p>
              ) : (
                data.salesByDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-slate-600">
                      {new Date(d.date).toLocaleDateString("bs-BA", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <div className="flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-6 rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(100, (d.amount / maxSalesDay) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-slate-900">
                      {d.amount.toFixed(2)} KM
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Posjete po danima
            </h2>
            <div className="space-y-2">
              {data.visitsByDay.length === 0 ? (
                <p className="text-sm text-slate-500">Nema posjeta u ovom periodu.</p>
              ) : (
                data.visitsByDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-slate-600">
                      {new Date(d.date).toLocaleDateString("bs-BA", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <div className="flex-1 space-y-1">
                      {d.planned > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-xs text-slate-500">Plan:</span>
                          <div className="flex-1 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-blue-400"
                              style={{
                                width: `${Math.min(100, (d.planned / maxVisits) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-xs font-medium text-slate-700">
                            {d.planned}
                          </span>
                        </div>
                      )}
                      {d.done > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-xs text-slate-500">Gotovo:</span>
                          <div className="flex-1 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.min(100, (d.done / maxVisits) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-xs font-medium text-slate-700">
                            {d.done}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "advanced" && (
        <>
          {/* Trend analiza */}
          {data.trendAnalysis && data.trendAnalysis.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Trend analiza (posljednjih 6 mjeseci)
              </h2>
              <div className="space-y-3">
                {data.trendAnalysis.map((trend, idx) => (
                  <div key={`${trend.year}-${trend.month}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {monthNames[trend.month - 1]} {trend.year}
                      </span>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>{trend.sales.toFixed(2)} KM</span>
                        <span>{trend.orders} narudžbi</span>
                        <span>{trend.visits} posjeta</span>
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, (trend.sales / Math.max(...data.trendAnalysis!.map(t => t.sales), 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novi vs postojeći klijenti */}
          {data.newVsExistingClients && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Novi vs postojeći klijenti
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Novi klijenti</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {data.newVsExistingClients.newClients}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.newVsExistingClients.newClientsCount} narudžbi • {data.newVsExistingClients.newClientsSales.toFixed(2)} KM
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Postojeći klijenti</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {data.newVsExistingClients.existingClientsCount > 0 ? Math.round((data.newVsExistingClients.existingClientsCount / (data.newVsExistingClients.newClientsCount + data.newVsExistingClients.existingClientsCount)) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.newVsExistingClients.existingClientsCount} narudžbi • {data.newVsExistingClients.existingClientsSales.toFixed(2)} KM
                    </div>
                  </div>
                </div>
              </div>

              {/* Churn analiza */}
              {data.churnedClients && data.churnedClients.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Klijenti u riziku (bez narudžbi 3+ mjeseca)
                  </h2>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {data.churnedClients.slice(0, 10).map((client) => (
                      <div
                        key={client.clientId}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">{client.client}</span>
                        <span className="text-xs text-red-600">
                          {client.monthsSinceLastOrder} mj.
                        </span>
                      </div>
                    ))}
                  </div>
                  {data.churnedClients.length > 10 && (
                    <p className="mt-2 text-xs text-slate-500">
                      +{data.churnedClients.length - 10} više klijenata...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Razlog otkazivanja posjeta */}
          {data.cancellationReasons && data.cancellationReasons.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Najčešći razlozi otkazivanja posjeta
              </h2>
              <div className="space-y-2">
                {data.cancellationReasons.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <span className="text-sm text-slate-700">{item.reason}</span>
                    <span className="text-sm font-semibold text-red-600">{item.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posjete bez narudžbi */}
          {data.visitsWithoutOrders && data.visitsWithoutOrders.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Posjete bez narudžbi (Missed Opportunities)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Završene posjete koje nisu rezultovale narudžbom u narednih 7 dana
                </p>
              </div>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Klijent</th>
                      <th className="px-4 py-3 text-left">Komercijalista</th>
                      <th className="px-4 py-3 text-left">Datum posjete</th>
                      <th className="px-4 py-3 text-left">Napomena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visitsWithoutOrders.map((visit) => (
                      <tr
                        key={visit.visitId}
                        className="border-t border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {visit.clientName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{visit.commercialName}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(visit.scheduledAt).toLocaleDateString("bs-BA", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">
                          {visit.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4">
                {data.visitsWithoutOrders.map((visit) => (
                  <div
                    key={visit.visitId}
                    className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                  >
                    <div className="font-medium text-slate-800">{visit.clientName}</div>
                    <div className="text-sm text-slate-600">
                      Komercijalista: {visit.commercialName}
                    </div>
                    <div className="text-sm text-slate-600">
                      Datum:{" "}
                      {new Date(visit.scheduledAt).toLocaleDateString("bs-BA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    {visit.note && (
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                        {visit.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Lifetime Value */}
          {data.customerLifetimeValue && data.customerLifetimeValue.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Customer Lifetime Value (Top 20)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Najvrijedniji klijenti po ukupnoj prodaji kroz historiju
                </p>
              </div>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Klijent</th>
                      <th className="px-4 py-3 text-right">Ukupna prodaja</th>
                      <th className="px-4 py-3 text-right">Narudžbe</th>
                      <th className="px-4 py-3 text-right">Prosjek narudžbe</th>
                      <th className="px-4 py-3 text-left">Prva narudžba</th>
                      <th className="px-4 py-3 text-left">Posljednja narudžba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customerLifetimeValue.map((client) => (
                      <tr
                        key={client.clientId}
                        className="border-t border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {client.client}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {client.totalSales.toFixed(2)} KM
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {client.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {client.avgOrderValue.toFixed(2)} KM
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {new Date(client.firstOrderDate).toLocaleDateString("bs-BA")}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {new Date(client.lastOrderDate).toLocaleDateString("bs-BA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3 p-4">
                {data.customerLifetimeValue.map((client) => (
                  <div
                    key={client.clientId}
                    className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                  >
                    <div className="font-medium text-slate-800">{client.client}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-500">Ukupna prodaja: </span>
                        <span className="font-semibold text-slate-800">{client.totalSales.toFixed(2)} KM</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Narudžbe: </span>
                        <span className="text-slate-800">{client.totalOrders}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Prosjek: </span>
                        <span className="text-slate-800">{client.avgOrderValue.toFixed(2)} KM</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proizvodi u padu/rastu */}
          {data.productsTrending && (
            <div className="grid gap-4 md:grid-cols-2">
              {data.productsTrending.growing.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    📈 Proizvodi u rastu (Top 10)
                  </h2>
                  <div className="space-y-2">
                    {data.productsTrending.growing.map((product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {product.productName}
                          </div>
                          <div className="text-xs text-slate-500">{product.brand}</div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-semibold text-emerald-600">
                            +{product.changePercent.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {product.currentAmount.toFixed(2)} KM
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.productsTrending.declining.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    📉 Proizvodi u padu (Top 10)
                  </h2>
                  <div className="space-y-2">
                    {data.productsTrending.declining.map((product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-800 truncate">
                            {product.productName}
                          </div>
                          <div className="text-xs text-slate-500">{product.brand}</div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm font-semibold text-red-600">
                            {product.changePercent.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {product.currentAmount.toFixed(2)} KM
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KPI Dashboard */}
          {data.kpiDashboard && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                KPI Dashboard sa targetima
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { key: "sales", label: "Prodaja", kpi: data.kpiDashboard.sales },
                  { key: "orders", label: "Narudžbe", kpi: data.kpiDashboard.orders },
                  { key: "visits", label: "Posjete", kpi: data.kpiDashboard.visits },
                  { key: "conversion", label: "Konverzija", kpi: data.kpiDashboard.conversion },
                ].map(({ key, label, kpi }) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <span
                        className={`text-xs font-semibold ${
                          kpi.percentage >= 100
                            ? "text-emerald-600"
                            : kpi.percentage >= 80
                            ? "text-blue-600"
                            : kpi.percentage >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {kpi.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="text-lg font-semibold text-slate-900">
                        {key === "sales" || key === "conversion"
                          ? kpi.current.toFixed(2) + (key === "sales" ? " KM" : "%")
                          : kpi.current}
                      </div>
                      {kpi.target > 0 && (
                        <div className="text-xs text-slate-500">
                          Target: {key === "sales" ? kpi.target.toFixed(2) + " KM" : kpi.target}
                        </div>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          kpi.percentage >= 100
                            ? "bg-emerald-500"
                            : kpi.percentage >= 80
                            ? "bg-blue-500"
                            : kpi.percentage >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, kpi.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Funnel analiza */}
          {data.funnelAnalysis && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Funnel analiza (posjete → narudžbe)
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "Planirane posjete",
                    value: data.funnelAnalysis.plannedVisits,
                    next: data.funnelAnalysis.doneVisits,
                    conversion: data.funnelAnalysis.conversionRates.plannedToDone,
                  },
                  {
                    label: "Završene posjete",
                    value: data.funnelAnalysis.doneVisits,
                    next: data.funnelAnalysis.visitsWithOrders,
                    conversion: data.funnelAnalysis.conversionRates.doneToOrder,
                  },
                  {
                    label: "Posjete sa narudžbom",
                    value: data.funnelAnalysis.visitsWithOrders,
                    next: data.funnelAnalysis.approvedOrders,
                    conversion: 0,
                  },
                  {
                    label: "Odobrene narudžbe",
                    value: data.funnelAnalysis.approvedOrders,
                    next: data.funnelAnalysis.completedOrders,
                    conversion: data.funnelAnalysis.conversionRates.approvedToCompleted,
                  },
                  {
                    label: "Završene narudžbe",
                    value: data.funnelAnalysis.completedOrders,
                    next: 0,
                    conversion: 0,
                  },
                ].map((step, idx) => (
                  <div key={idx}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{step.label}</span>
                      <div className="flex items-center gap-3">
                        {step.conversion > 0 && (
                          <span className="text-xs text-slate-500">
                            Konverzija: {step.conversion.toFixed(1)}%
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">{step.value}</span>
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(100, (step.value / (data.funnelAnalysis?.plannedVisits || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aktivnost komercijalista (heatmap) */}
          {data.commercialActivityHeatmap && data.commercialActivityHeatmap.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Aktivnost komercijalista (kalendarski prikaz)
              </h2>
              <div className="space-y-4">
                {data.commercialActivityHeatmap.slice(0, 5).map((com) => (
                  <div key={com.commercialId} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="mb-2 font-medium text-slate-800">{com.commercial}</div>
                    <div className="flex flex-wrap gap-1">
                      {com.activityByDate.slice(0, 30).map((day) => (
                        <div
                          key={day.date}
                          className={`h-4 w-4 rounded ${
                            day.totalActivity === 0
                              ? "bg-slate-100"
                              : day.totalActivity === 1
                              ? "bg-blue-200"
                              : day.totalActivity === 2
                              ? "bg-blue-400"
                              : day.totalActivity >= 3
                              ? "bg-blue-600"
                              : "bg-slate-100"
                          }`}
                          title={`${day.date}: ${day.visits} posjeta, ${day.orders} narudžbi`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>Ukupno: {com.activityByDate.reduce((sum, d) => sum + d.totalActivity, 0)} aktivnosti</span>
                      <span>Posjete: {com.activityByDate.reduce((sum, d) => sum + d.visits, 0)}</span>
                      <span>Narudžbe: {com.activityByDate.reduce((sum, d) => sum + d.orders, 0)}</span>
                    </div>
                  </div>
                ))}
                {data.commercialActivityHeatmap.length > 5 && (
                  <p className="text-xs text-slate-500">
                    +{data.commercialActivityHeatmap.length - 5} više komercijalista...
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

