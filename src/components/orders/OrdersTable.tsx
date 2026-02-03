"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  commercial: { name: string };
};

export function OrdersTable() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // Polling za nove narudžbe svakih 30 sekundi
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Na čekanju";
      case "APPROVED":
        return "Poslano";
      case "COMPLETED":
        return "Završeno";
      case "CANCELED":
        return "Otkazano";
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
        return "bg-emerald-100 text-emerald-700";
      case "CANCELED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <p className="text-sm font-medium text-slate-700">Sve narudžbe</p>
        <p className="text-xs text-slate-500">
          Klikni na narudžbu za detalje i akcije.
        </p>
      </div>
      {loading ? (
        <div className="p-6 text-sm text-slate-500">Učitavanje...</div>
      ) : orders.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Nema narudžbi.</div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Broj</th>
                  <th className="px-4 py-3 text-left">Klijent</th>
                  <th className="px-4 py-3 text-left">Komercijalista</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Datum</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/dashboard/order-manager/orders/${order.id}`)}
                    className="border-t border-slate-100 hover:bg-blue-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">{order.client.name}</td>
                    <td className="px-4 py-3">{order.commercial.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(
                          order.status
                        )}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(order.totalAmount).toFixed(2)} KM
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("bs-BA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3 p-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => router.push(`/dashboard/order-manager/orders/${order.id}`)}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-blue-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 mb-1">
                      {order.orderNumber}
                    </div>
                    <div className="text-sm text-slate-600 truncate">
                      {order.client.name}
                    </div>
                    <div className="text-sm text-slate-600 truncate">
                      {order.commercial.name}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ml-2 ${statusColor(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString("bs-BA")}
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {Number(order.totalAmount).toFixed(2)} KM
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}