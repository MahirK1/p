"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ClientDetail = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  note?: string | null;
  branches: Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    commercial: { name: string };
    branch?: { name: string } | null;
  }>;
  visits: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    note?: string | null;
    commercial: { name: string };
    manager?: { name: string } | null;
  }>;
};

export default function ManagerClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          notFound();
          return;
        }
        throw new Error("Failed to load client");
      }
      const data = await res.json();
      setClient(data);
    } catch (error) {
      console.error("Error loading client:", error);
      showToast("Greška pri učitavanju klijenta.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Na čekanju";
      case "APPROVED":
        return "Poslano";
      case "COMPLETED":
        return "Završeno";
      case "CANCELED":
        return "Otkaženo";
      case "PLANNED":
        return "Planirano";
      case "DONE":
        return "Završeno";
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700";
      case "APPROVED":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
      case "DONE":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELED":
        return "bg-red-100 text-red-700";
      case "PLANNED":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!client) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Nazad na listu
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
        </div>
      </div>

      {/* Informacije o apoteci */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Informacije o apoteci</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {client.address && (
              <div>
                <span className="font-medium text-slate-600">Adresa: </span>
                <span className="text-slate-900">
                  {client.address}
                  {client.city && `, ${client.city}`}
                </span>
              </div>
            )}
            {client.phone && (
              <div>
                <span className="font-medium text-slate-600">Telefon: </span>
                <span className="text-slate-900">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div>
                <span className="font-medium text-slate-600">Email: </span>
                <span className="text-slate-900">{client.email}</span>
              </div>
            )}
            {client.contactPerson && (
              <div>
                <span className="font-medium text-slate-600">Kontakt osoba: </span>
                <span className="text-slate-900">{client.contactPerson}</span>
              </div>
            )}
          </div>
          {client.note && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-600">Napomena: </span>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{client.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Podružnice */}
      {client.branches && client.branches.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Podružnice ({client.branches.length})
            </h2>
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Naziv</th>
                  <th className="px-4 py-3 text-left">Adresa</th>
                  <th className="px-4 py-3 text-left">Grad</th>
                  <th className="px-4 py-3 text-left">Telefon</th>
                </tr>
              </thead>
              <tbody>
                {client.branches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{branch.name}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.address || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.city || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3 p-4">
            {client.branches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
              >
                <div className="font-medium text-slate-800 mb-2">
                  {branch.name}
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  {branch.address && (
                    <div>
                      <span className="text-slate-500">Adresa: </span>
                      {branch.address}
                    </div>
                  )}
                  {branch.city && (
                    <div>
                      <span className="text-slate-500">Grad: </span>
                      {branch.city}
                    </div>
                  )}
                  {branch.phone && (
                    <div>
                      <span className="text-slate-500">Telefon: </span>
                      {branch.phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posjete */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Posjete ({client.visits.length})
          </h2>
        </div>
        {client.visits.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Nema posjeta.</div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum / vrijeme</th>
                    <th className="px-4 py-3 text-left">Komercijalista</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {client.visits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 text-slate-900">
                        {new Date(visit.scheduledAt).toLocaleString("bs-BA", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{visit.commercial.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusColor(
                            visit.status
                          )}`}
                        >
                          {statusLabel(visit.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {visit.note ? (
                          <span className="line-clamp-2">{visit.note}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {client.visits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 mb-1">
                        {visit.commercial.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(visit.scheduledAt).toLocaleString("bs-BA", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold flex-shrink-0 ml-2 ${statusColor(
                        visit.status
                      )}`}
                    >
                      {statusLabel(visit.status)}
                    </span>
                  </div>
                  {visit.note && (
                    <div className="text-sm text-slate-600 pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Napomena: </span>
                      {visit.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fakture (Narudžbe) */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Fakture / Narudžbe ({client.orders.length})
          </h2>
        </div>
        {client.orders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Nema narudžbi.</div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Broj narudžbe</th>
                    <th className="px-4 py-3 text-left">Komercijalista</th>
                    <th className="px-4 py-3 text-left">Podružnica</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ukupno</th>
                    <th className="px-4 py-3 text-right">Datum</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {client.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{order.commercial.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {order.branch?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusColor(
                            order.status
                          )}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {Number(order.totalAmount).toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString("bs-BA")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/order-manager/orders/${order.id}`}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                        >
                          Detalji →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {client.orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 mb-1">
                        {order.orderNumber}
                      </div>
                      <div className="text-sm text-slate-600">
                        {order.commercial.name}
                      </div>
                      {order.branch?.name && (
                        <div className="text-sm text-slate-600">
                          {order.branch.name}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold flex-shrink-0 ml-2 ${statusColor(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-sm">
                      <span className="text-slate-500">Datum: </span>
                      <span className="text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString("bs-BA")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-800">
                        {Number(order.totalAmount).toFixed(2)} KM
                      </div>
                      <Link
                        href={`/dashboard/order-manager/orders/${order.id}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        Detalji →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
