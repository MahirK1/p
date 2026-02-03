"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { PencilIcon } from "@heroicons/react/24/outline";

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
    email?: string | null;
    contactPerson?: string | null;
    zipCode?: string | null;
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

export default function CommercialClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Pagination state for branches
  const [branchPage, setBranchPage] = useState(1);
  const branchesPerPage = 10;

  // Edit modals state
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<ClientDetail["branches"][0] | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for client
  const [clientForm, setClientForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    contactPerson: "",
    note: "",
  });

  // Form state for branch
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    contactPerson: "",
    zipCode: "",
  });

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

  // Paginated branches
  const paginatedBranches = useMemo(() => {
    if (!client?.branches) return [];
    const start = (branchPage - 1) * branchesPerPage;
    const end = start + branchesPerPage;
    return client.branches.slice(start, end);
  }, [client?.branches, branchPage, branchesPerPage]);

  const totalBranchPages = useMemo(() => {
    if (!client?.branches) return 0;
    return Math.ceil((client.branches.length || 0) / branchesPerPage);
  }, [client?.branches, branchesPerPage]);

  // Open edit client modal
  const handleEditClient = () => {
    if (!client) return;
    setClientForm({
      name: client.name || "",
      address: client.address || "",
      city: client.city || "",
      phone: client.phone || "",
      email: client.email || "",
      contactPerson: client.contactPerson || "",
      note: client.note || "",
    });
    setIsEditClientModalOpen(true);
  };

  // Open edit branch modal
  const handleEditBranch = (branch: ClientDetail["branches"][0]) => {
    setBranchForm({
      name: branch.name || "",
      address: branch.address || "",
      city: branch.city || "",
      phone: branch.phone || "",
      email: branch.email || "",
      contactPerson: branch.contactPerson || "",
      zipCode: branch.zipCode || "",
    });
    setSelectedBranch(branch);
    setIsEditBranchModalOpen(true);
  };

  // Save client
  const handleSaveClient = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: client.id,
          ...clientForm,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update client");
      }

      await loadClient();
      setIsEditClientModalOpen(false);
      showToast("Podaci o klijentu su uspješno ažurirani.", "success");
    } catch (error: any) {
      console.error("Error updating client:", error);
      showToast(error.message || "Greška pri ažuriranju klijenta.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save branch
  const handleSaveBranch = async () => {
    if (!selectedBranch) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBranch.id,
          ...branchForm,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update branch");
      }

      await loadClient();
      setIsEditBranchModalOpen(false);
      setSelectedBranch(null);
      showToast("Podaci o podružnici su uspješno ažurirani.", "success");
    } catch (error: any) {
      console.error("Error updating branch:", error);
      showToast(error.message || "Greška pri ažuriranju podružnice.", "error");
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => router.back()}
            className="mb-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Nazad na listu
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
        </div>
        <button
          onClick={handleEditClient}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <PencilIcon className="w-4 h-4" />
          Uredi podatke
        </button>
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Naziv</th>
                  <th className="px-4 py-3 text-left">Adresa</th>
                  <th className="px-4 py-3 text-left">Grad</th>
                  <th className="px-4 py-3 text-left">Telefon</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Kontakt osoba</th>
                  <th className="px-4 py-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{branch.name}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.address || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.city || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.contactPerson || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEditBranch(branch)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                        Uredi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalBranchPages > 1 && (
            <Pagination
              currentPage={branchPage}
              totalPages={totalBranchPages}
              onPageChange={setBranchPage}
              totalItems={client.branches.length}
              itemsPerPage={branchesPerPage}
            />
          )}
        </div>
      )}

      {/* Posjete */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Posjete ({client.visits?.length || 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {!client.visits || client.visits.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Nema posjeta.</div>
          ) : (
            <table className="min-w-full text-sm">
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
          )}
        </div>
      </div>

      {/* Fakture (Narudžbe) */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Fakture / Narudžbe ({client.orders?.length || 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {!client.orders || client.orders.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Nema narudžbi.</div>
          ) : (
            <table className="min-w-full text-sm">
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
          )}
        </div>
      </div>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        title="Uredi podatke o klijentu"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Naziv klijenta *
            </label>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresa</label>
              <input
                type="text"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grad</label>
              <input
                type="text"
                value={clientForm.city}
                onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kontakt osoba</label>
            <input
              type="text"
              value={clientForm.contactPerson}
              onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Napomena</label>
            <textarea
              value={clientForm.note}
              onChange={(e) => setClientForm({ ...clientForm, note: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditClientModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={saving}
            >
              Odustani
            </button>
            <button
              type="button"
              onClick={handleSaveClient}
              disabled={saving || !clientForm.name.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? "Spremanje..." : "Spremi promjene"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal
        isOpen={isEditBranchModalOpen}
        onClose={() => {
          setIsEditBranchModalOpen(false);
          setSelectedBranch(null);
        }}
        title="Uredi podatke o podružnici"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Naziv podružnice *
            </label>
            <input
              type="text"
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresa</label>
              <input
                type="text"
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Grad</label>
              <input
                type="text"
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={branchForm.email}
                onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kontakt osoba</label>
              <input
                type="text"
                value={branchForm.contactPerson}
                onChange={(e) => setBranchForm({ ...branchForm, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Poštanski broj</label>
              <input
                type="text"
                value={branchForm.zipCode}
                onChange={(e) => setBranchForm({ ...branchForm, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsEditBranchModalOpen(false);
                setSelectedBranch(null);
              }}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={saving}
            >
              Odustani
            </button>
            <button
              type="button"
              onClick={handleSaveBranch}
              disabled={saving || !branchForm.name.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? "Spremanje..." : "Spremi promjene"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
