"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Brand = {
  id: string;
  name: string;
  createdAt: string;
};

type FormState = {
  id?: string;
  name: string;
};

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
  });

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const term = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(term));
  }, [brands, search]);

  const loadBrands = async () => {
    setLoading(true);
    const res = await fetch("/api/brands");
    const data = await res.json();
    setBrands(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const openCreateModal = () => {
    setIsEdit(false);
    setForm({ name: "" });
    setModalOpen(true);
  };

  const openEditModal = (brand: Brand) => {
    setIsEdit(true);
    setForm({ id: brand.id, name: brand.name });
    setModalOpen(true);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch("/api/brands", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setModalOpen(false);
        await loadBrands();
      } else {
        const err = await res.json();
        showToast("Greška: " + (err.error || "Nepoznata greška"), "error");
      }
    } catch (error) {
      showToast("Greška: " + error, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati brend "${name}"?`)) {
      return;
    }

    const res = await fetch(`/api/brands?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await loadBrands();
    } else {
      const err = await res.json();
      showToast("Greška: " + (err.error || "Nepoznata greška"), "error");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Brendovi</h1>
          <p className="text-sm text-slate-500">
            Upravljaj brendovima proizvoda.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-500"
          onClick={openCreateModal}
        >
          + Dodaj brend
        </button>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:max-w-sm"
            placeholder="Pretraži po nazivu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Nema brendova za prikaz.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Naziv</th>
                  <th className="px-4 py-3 text-left">Datum kreiranja</th>
                  <th className="px-4 py-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand) => (
                  <tr
                    key={brand.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {brand.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(brand.createdAt).toLocaleDateString("bs-BA")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                          onClick={() => openEditModal(brand)}
                        >
                          Uredi
                        </button>
                        <button
                          className="text-sm font-medium text-red-600 hover:text-red-500"
                          onClick={() => handleDelete(brand.id, brand.name)}
                        >
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {isEdit ? "Uredi brend" : "Novi brend"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Unesite naziv brenda.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Naziv *
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={onChange}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="Npr. Ital Pharma"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    className={classNames(
                      "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500",
                      submitting && "opacity-70 cursor-not-allowed"
                    )}
                    disabled={submitting}
                  >
                    {submitting ? "Spremam..." : isEdit ? "Spremi promjene" : "Dodaj brend"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
