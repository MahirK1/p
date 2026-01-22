"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Pagination } from "@/components/ui/Pagination";

type Client = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  branches?: Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
  }>;
};

const ITEMS_PER_PAGE = 20;

export default function CommercialClientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        throw new Error("Failed to load clients");
      }
      const data = await res.json();
      setClients(data || []);
      setCurrentPage(1); // Reset to first page when loading new data
    } catch (error) {
      console.error("Error loading clients:", error);
      showToast("Greška pri učitavanju klijenata.", "error");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const term = search.toLowerCase();
    return clients.filter((c) =>
      `${c.name} ${c.city ?? ""} ${c.email ?? ""} ${c.address ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [clients, search]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredClients.slice(start, end);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Apoteke (Klijenti)</h1>
          <p className="text-sm text-slate-500">
            Pregled svih apoteka, njihovih podružnica, posjeta i faktura.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:max-w-sm"
            placeholder="Pretraži po nazivu, gradu, emailu..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
          <div className="text-sm text-slate-600">
            {filteredClients.length} {filteredClients.length === 1 ? "klijent" : "klijenata"}
          </div>
        </div>
        <div>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : paginatedClients.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              {clients.length === 0
                ? "Nema klijenata za prikaz."
                : "Nema rezultata pretrage."}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <table className="hidden md:table min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Naziv</th>
                    <th className="px-4 py-3 text-left">Adresa</th>
                    <th className="px-4 py-3 text-left">Grad</th>
                    <th className="px-4 py-3 text-left">Telefon</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Kontakt osoba</th>
                    <th className="px-4 py-3 text-left">Podružnice</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{client.name}</td>
                      <td className="px-4 py-3 text-slate-600">{client.address || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{client.city || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{client.phone || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{client.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{client.contactPerson || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {client.branches?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/dashboard/commercial/clients/${client.id}`)}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                        >
                          Detalji →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedClients.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => router.push(`/dashboard/commercial/clients/${client.id}`)}
                  >
                    <h3 className="font-semibold text-slate-900 mb-2">{client.name}</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      {client.address && (
                        <div>
                          <span className="font-medium">Adresa: </span>
                          {client.address}
                          {client.city && `, ${client.city}`}
                        </div>
                      )}
                      {client.phone && (
                        <div>
                          <span className="font-medium">Telefon: </span>
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div>
                          <span className="font-medium">Email: </span>
                          {client.email}
                        </div>
                      )}
                      {client.branches && client.branches.length > 0 && (
                        <div className="text-xs text-slate-500 mt-2">
                          Podružnice: {client.branches.length}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredClients.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>
    </div>
  );
}
