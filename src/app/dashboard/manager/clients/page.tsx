"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

export default function ManagerClientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        throw new Error("Failed to load clients");
      }
      const data = await res.json();
      
      // API već vraća klijente sa branch-ovima, ne treba dodatni poziv
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      showToast("Greška pri učitavanju klijenata.", "error");
      setClients([]); // Postavi prazan array umjesto undefined
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              {clients.length === 0 
                ? "Nema klijenata za prikaz." 
                : "Nema rezultata pretrage."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-6 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => router.push(`/dashboard/manager/clients/${client.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {client.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
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
                        {client.contactPerson && (
                          <div>
                            <span className="font-medium">Kontakt osoba: </span>
                            {client.contactPerson}
                          </div>
                        )}
                      </div>
                      {client.branches && client.branches.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Podružnice ({client.branches.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {client.branches.map((branch) => (
                              <span
                                key={branch.id}
                                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                              >
                                {branch.name}
                                {branch.city && ` - ${branch.city}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link
                        href={`/dashboard/manager/clients/${client.id}`}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detalji →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
