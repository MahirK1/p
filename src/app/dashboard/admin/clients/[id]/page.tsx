"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  UserIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

type ClientBranch = {
  id: string;
  name: string;
  idBroj?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  zipCode?: string | null;
};

type Client = {
  id: string;
  erpId?: string | null;
  name: string;
  matBroj?: string | null;
  pdvBroj?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  note?: string | null;
  branches?: ClientBranch[];
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/clients?id=${id}`);
      if (!res.ok) {
        notFound();
        return;
      }
      const data = await res.json();
      setClient(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-500">Detalji o klijentu</p>
        </div>
      </div>

      {/* Podaci o klijentu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Osnovni podaci</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Adresa */}
          {client.address && (
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Adresa</p>
                <p className="text-sm text-slate-900">
                  {client.address}
                  {client.city && `, ${client.city}`}
                </p>
              </div>
            </div>
          )}

          {/* Telefon */}
          {client.phone && (
            <div className="flex items-start gap-3">
              <PhoneIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Telefon</p>
                <p className="text-sm text-slate-900">{client.phone}</p>
              </div>
            </div>
          )}

          {/* Email */}
          {client.email && (
            <div className="flex items-start gap-3">
              <EnvelopeIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Email</p>
                <a 
                  href={`mailto:${client.email}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {client.email}
                </a>
              </div>
            </div>
          )}

          {/* Odgovorna osoba */}
          {client.contactPerson && (
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Odgovorna osoba</p>
                <p className="text-sm text-slate-900">{client.contactPerson}</p>
              </div>
            </div>
          )}

          {/* Matični broj */}
          {client.matBroj && (
            <div className="flex items-start gap-3">
              <IdentificationIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Matični broj</p>
                <p className="text-sm text-slate-900">{client.matBroj}</p>
              </div>
            </div>
          )}

          {/* PDV broj */}
          {client.pdvBroj && (
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">PDV broj</p>
                <p className="text-sm text-slate-900">{client.pdvBroj}</p>
              </div>
            </div>
          )}

          {/* Napomena */}
          {client.note && (
            <div className="flex items-start gap-3 md:col-span-2">
              <DocumentTextIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Napomena</p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{client.note}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Podružnice */}
      {client.branches && client.branches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BuildingOfficeIcon className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Podružnice ({client.branches.length})
            </h2>
          </div>
          <div className="space-y-4">
            {client.branches.map((branch) => (
              <div
                key={branch.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                  {branch.idBroj && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      ID: {branch.idBroj}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {branch.address && (
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Adresa</p>
                        <p className="text-slate-900">
                          {branch.address}
                          {branch.city && `, ${branch.city}`}
                          {branch.zipCode && ` (${branch.zipCode})`}
                        </p>
                      </div>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-start gap-2">
                      <PhoneIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Telefon</p>
                        <p className="text-slate-900">{branch.phone}</p>
                      </div>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-start gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Email</p>
                        <a 
                          href={`mailto:${branch.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {branch.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {branch.contactPerson && (
                    <div className="flex items-start gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Kontakt osoba</p>
                        <p className="text-slate-900">{branch.contactPerson}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Poruka ako nema podružnica */}
      {(!client.branches || client.branches.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Podružnice</h2>
          </div>
          <p className="text-sm text-slate-500">Ovaj klijent nema podružnice.</p>
        </div>
      )}
    </div>
  );
}
