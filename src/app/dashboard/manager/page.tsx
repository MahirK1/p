"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ManagerAnalytics = {
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
};

type Commercial = {
  id: string;
  name: string;
};

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<ManagerAnalytics | null>(null);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCommercialId, setSelectedCommercialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "commercials" | "products" | "clients">("overview");

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
      const url = `/api/analytics/manager?year=${selectedYear}&month=${selectedMonth}${
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

  // useMemo MORA biti pozvan PRIJE uvjetnog return statementa
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
    link.setAttribute("download", `analitika_${selectedYear}_${selectedMonth}.csv`);
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
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ];

  const weekdayNames = ["Nedelja", "Ponedeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];

  return (
    <div className="space-y-6">
      {/* Header sa filterima */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analitika i statistika</h1>
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "overview", label: "Pregled" },
          { id: "commercials", label: "Komercijalisti" },
          { id: "products", label: "Proizvodi" },
          { id: "clients", label: "Klijenti" },
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

      {/* KPI kartice */}
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

      {activeTab === "overview" && (
        <>
          {/* Grid sa Prodajom po danima i Posjetama po danima */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Prodaja po danima */}
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

            {/* Posjete po danima */}
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

          {/* Aktivnost po danima u sedmici */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Aktivnost po danima u sedmici
            </h2>
            <div className="space-y-3">
              {data.salesByWeekday.map((d) => (
                <div key={d.day}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {weekdayNames[d.day]}
                    </span>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>{d.amount.toFixed(2)} KM</span>
                      <span>{d.orders} narudžbi</span>
                      <span>{d.visits} posjeta</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.min(100, (d.amount / maxWeekdaySales) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "commercials" && (
        <>
          {/* Performance Ranking */}
          {data.performanceRanking.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Performance Ranking
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Rang</th>
                      <th className="px-4 py-3 text-left">Komercijalista</th>
                      <th className="px-4 py-3 text-right">Prodaja</th>
                      <th className="px-4 py-3 text-right">Narudžbe</th>
                      <th className="px-4 py-3 text-right">Posjete</th>
                      <th className="px-4 py-3 text-right">Konverzija</th>
                      <th className="px-4 py-3 text-right">Realizacija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.performanceRanking.map((com) => (
                      <tr
                        key={com.commercialId}
                        className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/dashboard/manager/commercials/${com.commercialId}?year=${selectedYear}&month=${selectedMonth}`
                          )
                        }
                      >
                        <td className="px-4 py-3">
                          {com.rank <= 3 ? (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                                com.rank === 1
                                  ? "bg-yellow-100 text-yellow-700"
                                  : com.rank === 2
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {com.rank}
                            </span>
                          ) : (
                            <span className="text-slate-600">{com.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {com.commercial}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {com.amount.toFixed(2)} KM
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {com.ordersCount}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {com.visitsDone} / {com.visitsCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-emerald-600">
                            {com.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-blue-600">
                            {com.visitCompletionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prodaja po komercijalisti */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Prodaja po komercijalisti
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Komercijalista</th>
                    <th className="px-4 py-3 text-right">Prodaja</th>
                    <th className="px-4 py-3 text-right">Narudžbe</th>
                    <th className="px-4 py-3 text-right">Prosjek narudžbe</th>
                    <th className="px-4 py-3 text-right">Posjete</th>
                    <th className="px-4 py-3 text-right">Konverzija</th>
                    <th className="px-4 py-3 text-right">Prosjek dana</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommercials.map((com) => (
                    <tr
                      key={com.commercialId}
                      className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/dashboard/manager/commercials/${com.commercialId}?year=${selectedYear}&month=${selectedMonth}`
                        )
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {com.commercial}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {com.amount.toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {com.ordersCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {com.avgOrderValue.toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {com.visitsDone} / {com.visitsCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-emerald-600">
                          {com.visitsDone > 0
                            ? ((com.visitsWithOrders / com.visitsDone) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {com.avgDaysToOrder > 0
                          ? com.avgDaysToOrder.toFixed(1)
                          : "-"}{" "}
                        dana
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Achievement po komercijalisti */}
          {data.achievementByCommercial.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Realizacija planova
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Komercijalista</th>
                      <th className="px-4 py-3 text-right">Target</th>
                      <th className="px-4 py-3 text-right">Ostvareno</th>
                      <th className="px-4 py-3 text-right">Postotak</th>
                      <th className="px-4 py-3 text-right">Preostalo</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "products" && (
        <>
          {/* Top proizvodi */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Top proizvodi</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Proizvod</th>
                    <th className="px-4 py-3 text-left">Brend</th>
                    <th className="px-4 py-3 text-right">Količina</th>
                    <th className="px-4 py-3 text-right">Prodaja</th>
                    <th className="px-4 py-3 text-right">Narudžbe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {product.productName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {product.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {product.amount.toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {product.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prodaja po brendu */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Prodaja po brendu
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.salesByBrand.slice(0, 10).map((b) => (
                  <div key={b.brand}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{b.brand}</span>
                      <span className="font-semibold text-slate-900">
                        {b.amount.toFixed(2)} KM
                      </span>
                    </div>
                    <div className="rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, (b.amount / maxBrandSales) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "clients" && (
        <>
          {/* Top klijenti */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Top klijenti</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Klijent</th>
                    <th className="px-4 py-3 text-right">Prodaja</th>
                    <th className="px-4 py-3 text-right">Narudžbe</th>
                    <th className="px-4 py-3 text-right">Prosjek narudžbe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topClients.map((client) => (
                    <tr
                      key={client.clientId}
                      className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/manager/clients/${client.clientId}`)
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {client.client}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {client.amount.toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {client.ordersCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {(client.amount / client.ordersCount).toFixed(2)} KM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.topClients.length === 0 && (
                <div className="flex items-center justify-center p-12">
                  <LoadingSpinner size="md" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}