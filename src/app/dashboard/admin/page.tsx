"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/ToastProvider";

type AdminStats = {
  users: {
    total: number;
    byRole: {
      commercial: number;
      manager: number;
      orderManager: number;
      admin: number;
    };
    recent: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
    }>;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  clients: {
    total: number;
    withBranches: number;
  };
  brands: {
    total: number;
  };
  orders: {
    total: number;
    byStatus: {
      pending: number;
      approved: number;
      completed: number;
      canceled: number;
    };
    recent: Array<{
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      commercial: string;
      client: string;
      createdAt: string;
    }>;
  };
  sales: {
    total: number;
    monthly: number;
  };
  visits: {
    total: number;
    planned: number;
    done: number;
    canceled: number;
    monthly: number;
  };
  monthly: {
    orders: number;
    sales: number;
    visits: number;
  };
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/admin");
      if (!res.ok) {
        throw new Error("Failed to load stats");
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
      showToast("Greška pri učitavanju statistika.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const roleNames: Record<string, string> = {
    COMMERCIAL: "Komercijalista",
    MANAGER: "Manager",
    ORDER_MANAGER: "Order Manager",
    ADMIN: "Admin",
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">
          Pregled sistema i upravljanje resursima
        </p>
      </div>

      {/* KPI kartice - Glavne statistike */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/admin/users"
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Ukupno korisnika</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.users.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.users.byRole.commercial} komercijalista, {stats.users.byRole.manager}{" "}
            manager
          </p>
        </Link>

        <Link
          href="/dashboard/admin/products"
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Ukupno proizvoda</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.products.total}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {stats.products.outOfStock > 0 && (
              <span className="text-xs text-red-600">
                {stats.products.outOfStock} nedostupno
              </span>
            )}
            {stats.products.lowStock > 0 && (
              <span className="text-xs text-amber-600">
                {stats.products.lowStock} malo na zalihi
              </span>
            )}
          </div>
        </Link>

        <Link
          href="/dashboard/admin/clients"
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Ukupno klijenata</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.clients.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.clients.withBranches} sa podružnicama
          </p>
        </Link>

        <Link
          href="/dashboard/admin/brands"
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Ukupno brandova</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.brands.total}
          </p>
        </Link>
      </div>

      {/* Statistike ovaj mjesec */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Statistike za ovaj mjesec
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Narudžbe</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.monthly.orders}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Prodaja</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.monthly.sales.toFixed(2)} KM
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Posjete</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.monthly.visits}
            </p>
          </div>
        </div>
      </div>

      {/* Grid sa detaljnim statistikama */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Narudžbe po statusu */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Narudžbe</h2>
            <p className="text-sm text-slate-500">Ukupno: {stats.orders.total}</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Na čekanju</span>
                <span className="font-semibold text-amber-600">
                  {stats.orders.byStatus.pending}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Odobrene</span>
                <span className="font-semibold text-blue-600">
                  {stats.orders.byStatus.approved}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Završene</span>
                <span className="font-semibold text-emerald-600">
                  {stats.orders.byStatus.completed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Otkazane</span>
                <span className="font-semibold text-red-600">
                  {stats.orders.byStatus.canceled}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard/order-manager"
              className="mt-4 block text-center text-sm text-emerald-600 hover:text-emerald-700"
            >
              Pregled svih narudžbi →
            </Link>
          </div>
        </div>

        {/* Posjete po statusu */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Posjete</h2>
            <p className="text-sm text-slate-500">Ukupno: {stats.visits.total}</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Planirane</span>
                <span className="font-semibold text-blue-600">
                  {stats.visits.planned}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Završene</span>
                <span className="font-semibold text-emerald-600">
                  {stats.visits.done}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Otkazane</span>
                <span className="font-semibold text-red-600">
                  {stats.visits.canceled}
                </span>
              </div>
            </div>
            <Link
              href="/dashboard/manager/visits"
              className="mt-4 block text-center text-sm text-emerald-600 hover:text-emerald-700"
            >
              Pregled posjeta →
            </Link>
          </div>
        </div>
      </div>

      {/* Grid sa poslednjim aktivnostima */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Poslednje narudžbe */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Poslednje narudžbe
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Broj</th>
                  <th className="px-4 py-3 text-left">Klijent</th>
                  <th className="px-4 py-3 text-right">Iznos</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.recent.map((order) => (
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
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          statusColors[order.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.orders.recent.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                Nema nedavnih narudžbi.
              </div>
            )}
          </div>
        </div>

        {/* Poslednji korisnici */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Poslednji korisnici
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Ime</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-right">Uloga</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.recent.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => router.push("/dashboard/admin/users")}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        {roleNames[user.role] || user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.users.recent.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                Nema nedavnih korisnika.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brzi linkovi */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Brzi linkovi</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition"
          >
            <div className="rounded-full bg-blue-100 p-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Korisnici</p>
              <p className="text-xs text-slate-500">Upravljanje korisnicima</p>
            </div>
          </Link>

          <Link
            href="/dashboard/admin/products"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition"
          >
            <div className="rounded-full bg-emerald-100 p-2">
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Proizvodi</p>
              <p className="text-xs text-slate-500">Upravljanje proizvodima</p>
            </div>
          </Link>

          <Link
            href="/dashboard/admin/clients"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition"
          >
            <div className="rounded-full bg-purple-100 p-2">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 20H4v-2a3 3 0 015.196-2.121M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Klijenti</p>
              <p className="text-xs text-slate-500">Upravljanje klijentima</p>
            </div>
          </Link>

          <Link
            href="/dashboard/admin/brands"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition"
          >
            <div className="rounded-full bg-amber-100 p-2">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Brandovi</p>
              <p className="text-xs text-slate-500">Upravljanje brandovima</p>
            </div>
          </Link>
        </div>
      </div>
      </div>
    );
  }