"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type CommercialAnalytics = {
  commercial: {
    id: string;
    name: string;
    email: string;
  };
  year: number;
  month: number;
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  visitsTotal: number;
  visitsDone: number;
  visitsPlanned: number;
  visitsCanceled: number;
  conversionRate: number;
  visitsWithOrders: number;
  salesByDay: Array<{ date: string; amount: number }>;
  topClients: Array<{
    clientId: string;
    client: string;
    amount: number;
    orders: number;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    createdAt: string;
    client: string;
  }>;
  visits: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    client: string;
    hasOrder: boolean;
  }>;
};

export default function CommercialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // VAŽNO: Svi hooks se moraju pozvati u istom redoslijedu, bez conditional logike
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { id } = use(params);
  const [data, setData] = useState<CommercialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Koristi searchParams nakon što su svi hooks pozvani
  const selectedYear = Number(searchParams?.get("year") ?? new Date().getFullYear());
  const selectedMonth = Number(searchParams?.get("month") ?? new Date().getMonth() + 1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/commercial/${id}?year=${selectedYear}&month=${selectedMonth}`
      );
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
    loadData();
  }, [id, selectedYear, selectedMonth]);

  // Early return mora biti NAKON svih hooks poziva
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

  const maxSalesDay = Math.max(...data.salesByDay.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Nazad
          </button>
          <h1 className="text-2xl font-semibold">{data.commercial.name}</h1>
          <p className="text-sm text-slate-500">{data.commercial.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
      </div>

      {/* KPI kartice */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ukupna prodaja</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.totalSales.toFixed(2)} KM
          </p>
          <p className="mt-1 text-xs text-slate-500">{data.totalOrders} narudžbi</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Prosječna vrijednost narudžbe
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {data.avgOrderValue.toFixed(2)} KM
          </p>
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
                <span className="w-24 text-sm text-slate-600">
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
                <span className="w-24 text-right text-sm font-semibold text-slate-900">
                  {d.amount.toFixed(2)} KM
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grid sa top klijentima i narudžbama */}
      <div className="grid gap-6 md:grid-cols-2">
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
                      {client.orders}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Poslednje narudžbe */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Poslednje narudžbe</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Broj narudžbe</th>
                  <th className="px-4 py-3 text-left">Klijent</th>
                  <th className="px-4 py-3 text-right">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/order-manager/orders/${order.id}`)
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order.client}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {order.totalAmount.toFixed(2)} KM
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
