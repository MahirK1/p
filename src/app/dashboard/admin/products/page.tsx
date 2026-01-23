"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";

type Brand = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  catalogNumber?: string | null;
  stock: number;
  price?: number | null;
  description?: string | null;
  brand?: Brand | null;
  brandId?: string | null;
};

type FormState = {
  id?: string;
  name: string;
  sku: string;
  catalogNumber: string;
  brandId: string;
  stock: string;
  price: string;
  description: string;
};

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
    sku: "",
    catalogNumber: "",
    brandId: "",
    stock: "0",
    price: "",
    description: "",
  });
  const [erpTableName, setErpTableName] = useState("");
  const [erpTableModalOpen, setErpTableModalOpen] = useState(false);
  const [savingTableName, setSavingTableName] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.catalogNumber ?? ""} ${p.brand?.name ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const loadData = async () => {
    setLoading(true);
    const [productsRes, brandsRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/brands"),
    ]);
    const [productsData, brandsData] = await Promise.all([
      productsRes.json(),
      brandsRes.json(),
    ]);
    setProducts(productsData);
    setBrands(brandsData);
    setLoading(false);
  };

  const loadErpTableName = async () => {
    try {
      const res = await fetch("/api/settings?key=erp_lager_table");
      const data = await res.json();
      setErpTableName(data.value || "ITAL_IMELBIS_2025");
    } catch (error) {
      console.error("Error loading ERP table name:", error);
    }
  };

  const saveErpTableName = async () => {
    if (!erpTableName.trim()) {
      showToast("Naziv tabele ne može biti prazan", "error");
      return;
    }

    setSavingTableName(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "erp_lager_table",
          value: erpTableName.trim(),
        }),
      });

      if (res.ok) {
        showToast("Naziv ERP tabele je ažuriran", "success");
        setErpTableModalOpen(false);
      } else {
        showToast("Greška pri ažuriranju naziva tabele", "error");
      }
    } catch (error) {
      showToast("Greška pri ažuriranju naziva tabele", "error");
    } finally {
      setSavingTableName(false);
    }
  };

  useEffect(() => {
    loadData();
    loadErpTableName(); // Učitaj ERP table name
  }, []);

  const openCreateModal = () => {
    setIsEdit(false);
    setForm({
      name: "",
      sku: "",
      catalogNumber: "",
      brandId: "",
      stock: "0",
      price: "",
      description: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setIsEdit(true);
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      catalogNumber: product.catalogNumber ?? "",
      brandId: product.brandId ?? "",
      stock: product.stock.toString(),
      price: product.price ? String(product.price) : "",
      description: product.description ?? "",
    });
    setModalOpen(true);
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEdit ? "PUT" : "POST";
    setSubmitting(true);
    const res = await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      setModalOpen(false);
      await loadData();
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  const [syncing, setSyncing] = useState(false);

  const syncFromErp = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/products", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Sinkronizacija završena: ${data.stats.created} kreirano, ${data.stats.updated} ažurirano`,
          "success"
        );
        await loadData(); // Ponovo učitaj proizvode
      } else {
        showToast(`Greška: ${data.error}`, "error");
      }
    } catch (error: any) {
      showToast("Greška pri sinkronizaciji", "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lager proizvoda</h1>
          <p className="text-sm text-slate-500">
            Upravljaj zalihama, cijenama i brendovima proizvoda.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setErpTableModalOpen(true)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300"
          >
            ERP Tabela
          </button>
          <button
            onClick={syncFromErp}
            disabled={syncing}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
          >
            {syncing ? "Sinkronizujem..." : "Sinkronizuj iz ERP"}
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none md:max-w-sm"
            placeholder="Pretraži po nazivu, SKU, brendu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nema proizvoda za prikaz.
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Naziv</th>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Brend</th>
                    <th className="px-4 py-3 text-right">Zaliha</th>
                    <th className="px-4 py-3 text-right">Cijena</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.name}
                        {p.catalogNumber && (
                          <span className="ml-2 text-xs text-slate-500">
                            #{p.catalogNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.brand?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {p.stock}
                      </td>
                      <td className="px-4 py-3 text-right">
                      {p.price != null
                          ? `${Number(p.price).toFixed(2)} KM`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                          onClick={() => openEditModal(p)}
                        >
                          Uredi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 mb-1">
                        {p.name}
                      </div>
                      {p.catalogNumber && (
                        <div className="text-xs text-slate-500 mb-1">
                          #{p.catalogNumber}
                        </div>
                      )}
                      <div className="text-sm text-slate-600">
                        SKU: {p.sku}
                      </div>
                      {p.brand?.name && (
                        <div className="text-sm text-slate-600">
                          Brend: {p.brand.name}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex-shrink-0 ml-2"
                      onClick={() => openEditModal(p)}
                    >
                      Uredi
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-sm">
                      <span className="text-slate-500">Zaliha: </span>
                      <span className="font-medium text-slate-800">{p.stock}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {p.price != null
                        ? `${Number(p.price).toFixed(2)} KM`
                        : "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {isEdit ? "Uredi proizvod" : "Novi proizvod"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Popuni osnovne podatke o artiklu.
                  </p>
                </div>
                <button
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Naziv *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      SKU *
                    </label>
                    <input
                      name="sku"
                      value={form.sku}
                      onChange={onChange}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Kataloški broj
                    </label>
                    <input
                      name="catalogNumber"
                      value={form.catalogNumber}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Brend
                    </label>
                    <select
                      name="brandId"
                      value={form.brandId}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Bez brenda</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Zaliha (kom)
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={form.stock}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Cijena (KM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="price"
                      value={form.price}
                      onChange={onChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Opis
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                    {submitting ? "Spremam..." : isEdit ? "Spremi promjene" : "Dodaj proizvod"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ERP Table Name Modal */}
      <Modal
        isOpen={erpTableModalOpen}
        onClose={() => setErpTableModalOpen(false)}
        title="Postavke ERP tabele"
        description="Postavite naziv tabele koja se koristi za sinkronizaciju proizvoda"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Naziv ERP tabele (npr. ITAL_IMELBIS_2025)
            </label>
            <input
              type="text"
              value={erpTableName}
              onChange={(e) => setErpTableName(e.target.value)}
              placeholder="ITAL_IMELBIS_2025"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Ova tabela se koristi pri sinkronizaciji proizvoda iz ERP baze
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setErpTableModalOpen(false)}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={savingTableName}
            >
              Odustani
            </button>
            <button
              type="button"
              onClick={saveErpTableName}
              disabled={savingTableName || !erpTableName.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {savingTableName ? "Spremanje..." : "Spremi"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function showToast(arg0: string, arg1: string) {
  throw new Error("Function not implemented.");
}
