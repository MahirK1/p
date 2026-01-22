"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

type ClientBranch = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
};

type Client = {
  id: string;
  name: string;
  branches?: ClientBranch[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
};

export default function CommercialOrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ordersRes, clientsRes] = await Promise.all([
        fetch("/api/orders?mine=1"),
        fetch("/api/clients"),
      ]);
      const [ordersData, clientsData] = await Promise.all([
        ordersRes.json(),
        clientsRes.json(),
      ]);
      setOrders(ordersData);
      setClients(clientsData);
      setLoading(false);
    }
    load();
  }, []);

  // Zatvori dropdown kada klikneš van njega
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    }

    if (clientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [clientDropdownOpen]);

  // Filtrirani klijenti za pretragu
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }, [clients, clientSearch]);

  // Odabrani klijent
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const term = search.toLowerCase();
    return orders.filter((o) =>
      `${o.orderNumber} ${o.client.name}`.toLowerCase().includes(term)
    );
  }, [orders, search]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Proslijeđeno";
      case "APPROVED":
        return "Prihvaćeno";
      case "COMPLETED":
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
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const openModal = () => {
    setSelectedClientId("");
    setSelectedBranchId("");
    setClientSearch("");
    setClientDropdownOpen(false);
    setModalOpen(true);
  };

  const startNewOrder = () => {
    if (!selectedClientId) {
      showToast("Odaberi klijenta.", "warning");
      return;
    }
    const params = new URLSearchParams();
    params.set("clientId", selectedClientId);
    if (selectedBranchId) {
      params.set("branchId", selectedBranchId);
    }
    setModalOpen(false);
    router.push(`/dashboard/commercial/orders/new?${params.toString()}`);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedBranchId(""); // Reset branch selection
    setClientDropdownOpen(false);
    setClientSearch(selectedClient?.name || "");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">Moje narudžbe</h1>
          <p className="text-sm text-slate-500 truncate">
            Pregled prethodnih narudžbi i kreiranje novih.
          </p>
        </div>
        <button
          onClick={openModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500"
        >
          + Nova narudžba
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 md:p-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:max-w-sm"
            placeholder="Pretraži po broju narudžbe ili klijentu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nema narudžbi za prikaz.
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Broj</th>
                    <th className="px-4 py-3 text-left">Klijent</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ukupno</th>
                    <th className="px-4 py-3 text-right">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/commercial/orders/${o.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3">{o.client.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(
                            o.status
                          )}`}
                        >
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {Number(o.totalAmount).toFixed(2)} KM
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString("bs-BA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => router.push(`/dashboard/commercial/orders/${o.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 mb-1">
                        {o.orderNumber}
                      </div>
                      <div className="text-sm text-slate-600 truncate">
                        {o.client.name}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium flex-shrink-0 ml-2 ${statusColor(
                        o.status
                      )}`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("bs-BA")}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {Number(o.totalAmount).toFixed(2)} KM
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Nova narudžba"
          description="Odaberi klijenta i podružnicu (ako postoji)."
          size="full"
        >
          <div className="space-y-6">
            {/* Klijent - Searchable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Klijent (apoteka) *
              </label>
              <div className="relative" ref={clientDropdownRef}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                    setSelectedClientId(""); // Reset selection when typing
                    setSelectedBranchId("");
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Unesi naziv apoteke ili klikni da vidiš listu..."
                />
                {clientDropdownOpen && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          handleClientSelect(client.id);
                          setClientSearch(client.name);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition ${
                          selectedClientId === client.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="font-medium text-sm text-slate-800">
                          {client.name}
                        </div>
                        {/* city property does not exist on Client, so do not render it */}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Branch - Obični Dropdown (samo ako klijent ima branches) */}
            {selectedClient && selectedClient.branches && selectedClient.branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Podružnica (opciono)
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">
                    {selectedClient.name} (Glavna)
                  </option>
                  {selectedClient.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.city && ` - ${branch.city}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prikaz odabranog klijenta ako nema branches */}
            {selectedClientId && (!selectedClient?.branches || selectedClient.branches.length === 0) && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-slate-800">
                  Odabrano: {selectedClient?.name}
                </div>
              </div>
            )}

            {/* Dugmad */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setModalOpen(false)}
              >
                Odustani
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={startNewOrder}
                disabled={!selectedClientId}
              >
                Kreiraj narudžbu
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}