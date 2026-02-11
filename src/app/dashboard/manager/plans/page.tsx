"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TrashIcon, PlusIcon, CalendarDaysIcon, ChartBarIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type Brand = { id: string; name: string };
type Product = { id: string; name: string; sku: string; brand?: { name: string } | null };
type UserCommercial = { id: string; name: string; email: string };
type PlanProductTarget = { productId: string; quantityTarget: number; product: Product };
type Plan = {
  id: string;
  month: number;
  year: number;
  totalTarget: number | null;
  brand?: { name: string } | null;
  commercialId?: string | null;
  commercial?: UserCommercial | null;
  productTargets?: PlanProductTarget[];
};

type AchievementPlan = {
  planId: string;
  brandName: string | null;
  totalTarget: number | null;
  totalAchieved: number;
  totalPercentage: number;
  productTargets: {
    productId: string;
    productName: string;
    quantityTarget: number;
    quantityAchieved: number;
    percentage: number;
  }[];
};

type CommercialAchievement = {
  commercialId: string;
  commercialName: string;
  plans: AchievementPlan[];
  totalTarget: number;
  totalAchieved: number;
  overallPercentage: number;
};

const productTargetEmpty = { productId: "", quantity: "" };

const MONTH_NAMES = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default function ManagerPlansPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [commercials, setCommercials] = useState<UserCommercial[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [achievement, setAchievement] = useState<{ byCommercial: CommercialAchievement[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievementLoading, setAchievementLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"planovi" | "realizacija planova">("planovi");
  const [formOpen, setFormOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterCommercialId, setFilterCommercialId] = useState("");
  const [achievementMonth, setAchievementMonth] = useState(new Date().getMonth() + 1);
  const [achievementYear, setAchievementYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    commercialId: "",
    brandId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalTarget: "",
    productTargets: [{ ...productTargetEmpty }] as { productId: string; quantity: string }[],
  });
  const [openProductDropdown, setOpenProductDropdown] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const { showToast } = useToast();

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand?.name && p.brand.name.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [products, productSearch]);

  const getProductLabel = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return "";
    return p.brand?.name ? `${p.name} (${p.brand.name})` : p.name;
  };

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [brandsRes, plansRes, usersRes, productsRes] = await Promise.all([
        fetch("/api/brands"),
        fetch("/api/plans"),
        fetch("/api/users?role=COMMERCIAL"),
        fetch("/api/products"),
      ]);

      const getErrorText = async (res: Response) => {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          return json.error || text;
        } catch {
          return text;
        }
      };

      if (!brandsRes.ok) throw new Error(await getErrorText(brandsRes));
      if (!plansRes.ok) throw new Error(await getErrorText(plansRes));
      if (!usersRes.ok) throw new Error(await getErrorText(usersRes));
      if (!productsRes.ok) throw new Error(await getErrorText(productsRes));

      const [brandsData, plansData, usersData, productsData] = await Promise.all([
        brandsRes.json(),
        plansRes.json(),
        usersRes.json(),
        productsRes.json(),
      ]);

      setBrands(brandsData);
      setPlans(plansData);
      setCommercials(usersData);
      setProducts(productsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      showToast("Greška pri učitavanju: " + (error.message || String(error)), "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAchievement = async () => {
    setAchievementLoading(true);
    try {
      const res = await fetch(
        `/api/plans/achievement?year=${achievementYear}&month=${achievementMonth}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAchievement(data);
    } catch (e: any) {
      showToast("Greška pri učitavanju ispunjenja: " + (e.message || String(e)), "error");
      setAchievement(null);
    } finally {
      setAchievementLoading(false);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterMonth !== "" && p.month !== filterMonth) return false;
      if (filterYear !== "" && p.year !== filterYear) return false;
      if (filterCommercialId && p.commercialId !== filterCommercialId) return false;
      return true;
    });
  }, [plans, filterMonth, filterYear, filterCommercialId]);

  const addProductRow = () => {
    setForm((f) => ({
      ...f,
      productTargets: [...f.productTargets, { ...productTargetEmpty }],
    }));
  };

  const removeProductRow = (index: number) => {
    setForm((f) => ({
      ...f,
      productTargets: f.productTargets.filter((_, i) => i !== index),
    }));
  };

  const updateProductRow = (index: number, field: "productId" | "quantity", value: string) => {
    setForm((f) => {
      const next = [...f.productTargets];
      next[index] = { ...next[index], [field]: value };
      return { ...f, productTargets: next };
    });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.commercialId) {
      showToast("Odaberite komercijalistu.", "error");
      return;
    }
    const targets = form.productTargets.filter(
      (r) => r.productId && r.quantity && Number(r.quantity) > 0
    );
    if (targets.length === 0 && !form.totalTarget) {
      showToast("Dodajte barem jedan proizvod s količinom ili ukupni target (KM).", "error");
      return;
    }

    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commercialId: form.commercialId,
        brandId: form.brandId || undefined,
        month: form.month,
        year: form.year,
        totalTarget: form.totalTarget ? Number(form.totalTarget) : undefined,
        productTargets: targets.map((t) => ({
          productId: t.productId,
          quantity: Number(t.quantity),
        })),
      }),
    });
    if (res.ok) {
      setFormOpen(false);
      setForm({
        commercialId: "",
        brandId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalTarget: "",
        productTargets: [{ ...productTargetEmpty }],
      });
      await load();
      showToast("Plan je uspješno kreiran!", "success");
    } else {
      const err = await res.json();
      showToast("Greška: " + (err.error || err), "error");
    }
  };

  const onDelete = async (planId: string) => {
    if (
      !confirm(
        "Da li ste sigurni da želite obrisati ovaj plan? Sve dodjele i targeti po proizvodima će također biti obrisani."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/plans?id=${planId}`, { method: "DELETE" });
      if (res.ok) {
        await load();
        showToast("Plan je uspješno obrisan!", "success");
      } else {
        const err = await res.json();
        showToast("Greška: " + (err.error || "Ne mogu obrisati plan"), "error");
      }
    } catch (error: any) {
      showToast("Greška pri brisanju plana", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mjesečni planovi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Definirajte planove po komercijalisti i proizvodima, te pratite realizaciju planova.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 w-fit mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("planovi")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "planovi"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Planovi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("realizacija planova")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "realizacija planova"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ChartBarIcon className="w-4 h-4" />
          Realizacija planova
        </button>
      </div>

      {/* Tab: Planovi */}
      {activeTab === "planovi" && (
        <div className="space-y-6">
          {/* Toolbar: filter + novi plan */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Svi mjeseci</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Godina"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <select
                value={filterCommercialId}
                onChange={(e) => setFilterCommercialId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[180px]"
              >
                <option value="">Svi komercijalisti</option>
                {commercials.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Novi plan
            </button>
          </div>

          {/* Form (collapsible card) */}
          {formOpen && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                <h2 className="text-base font-semibold text-slate-800">Novi mjesečni plan</h2>
                <p className="text-xs text-slate-500 mt-0.5">Komercijalista, period i targeti po proizvodima. Jednom komercijalisti možeš dodati više planova u istom mjesecu.</p>
              </div>
              <form onSubmit={onCreate} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Komercijalista *</label>
                    <select
                      value={form.commercialId}
                      onChange={(e) => setForm((f) => ({ ...f, commercialId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    >
                      <option value="">Odaberi</option>
                      {commercials.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brend</label>
                    <select
                      value={form.brandId}
                      onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Svi brendovi</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mjesec</label>
                    <select
                      value={form.month}
                      onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Godina</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target po proizvodima (kom)</label>
                  <p className="text-xs text-slate-500 mb-2">Kucaj po nazivu artikla da pronađeš proizvod, pa odaberi ispod.</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    {form.productTargets.map((row, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          <input
                            type="text"
                            placeholder="Kucaj naziv artikla..."
                            value={openProductDropdown === idx ? productSearch : (row.productId ? getProductLabel(row.productId) : "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setOpenProductDropdown(idx);
                              setProductSearch(v);
                              if (!v) updateProductRow(idx, "productId", "");
                            }}
                            onFocus={() => {
                              setOpenProductDropdown(idx);
                              setProductSearch(row.productId ? getProductLabel(row.productId) : "");
                            }}
                            onBlur={() => setTimeout(() => setOpenProductDropdown(null), 200)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          {openProductDropdown === idx && (
                            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-sm">
                              {filteredProducts.length === 0 ? (
                                <li className="px-3 py-2 text-slate-500">Nema rezultata</li>
                              ) : (
                                filteredProducts.map((p) => (
                                  <li
                                    key={p.id}
                                    className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-800"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateProductRow(idx, "productId", p.id);
                                      setProductSearch("");
                                      setOpenProductDropdown(null);
                                    }}
                                  >
                                    {p.brand?.name ? `${p.name} (${p.brand.name})` : p.name}
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </div>
                        <input
                          type="number"
                          min={1}
                          placeholder="Kom."
                          value={row.quantity}
                          onChange={(e) => updateProductRow(idx, "quantity", e.target.value)}
                          className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeProductRow(idx)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Ukloni"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addProductRow}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Dodaj proizvod
                    </button>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ukupni target (KM), opcionalno</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.totalTarget}
                    onChange={(e) => setForm((f) => ({ ...f, totalTarget: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="npr. 5000"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Spremi plan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista planova */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Postojeći planovi</h2>
              {(filterMonth !== "" || filterYear !== "" || filterCommercialId) && (
                <span className="text-xs text-slate-500">
                  Prikazano: {filteredPlans.length} od {plans.length}
                </span>
              )}
            </div>
            {filteredPlans.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {plans.length === 0
                  ? "Nema planova. Dodajte novi plan."
                  : "Nema planova za odabrane filtere."}
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Komercijalista</th>
                        <th className="px-4 py-3 font-medium">Brend</th>
                        <th className="px-4 py-3 font-medium">Period</th>
                        <th className="px-4 py-3 font-medium">Proizvodi (kom)</th>
                        <th className="px-4 py-3 font-medium text-right">Target KM</th>
                        <th className="px-4 py-3 w-20 text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlans.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {p.commercial?.name ?? "–"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.brand?.name ?? "Svi"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {MONTH_NAMES[p.month - 1]} {p.year}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs">
                            {p.productTargets?.length
                              ? p.productTargets
                                  .map((pt) => `${pt.product.name}: ${pt.quantityTarget}`)
                                  .join(", ")
                              : "–"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {p.totalTarget != null ? `${Number(p.totalTarget).toFixed(2)} KM` : "–"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => onDelete(p.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                              Obriši
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredPlans.map((p) => (
                    <div key={p.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{p.commercial?.name ?? "–"}</p>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {MONTH_NAMES[p.month - 1]} {p.year} · {p.brand?.name ?? "Svi"}
                          </p>
                          {p.productTargets?.length ? (
                            <p className="text-xs text-slate-500 mt-1">
                              {p.productTargets.map((pt) => `${pt.product.name}: ${pt.quantityTarget}`).join(", ")}
                            </p>
                          ) : null}
                          {p.totalTarget != null && (
                            <p className="text-sm font-medium text-slate-700 mt-1">
                              {Number(p.totalTarget).toFixed(2)} KM
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Realizacija planova */}
      {activeTab === "realizacija planova" && (
        <div className="space-y-12">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-800">Realizacija planova po komercijalisti</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <select
                  value={achievementMonth}
                  onChange={(e) => setAchievementMonth(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={achievementYear}
                  onChange={(e) => setAchievementYear(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  onClick={loadAchievement}
                  disabled={achievementLoading}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {achievementLoading ? "Učitavam…" : "Prikaži"}
                </button>
              </div>
            </div>
            <div className="p-6 md:p-8">
              {achievementLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}
              {!achievementLoading && achievement && achievement.byCommercial.length === 0 && (
                <p className="text-sm text-slate-500 py-8 text-center">
                  Nema planova ili ispunjenja za {MONTH_NAMES[achievementMonth - 1]} {achievementYear}.
                </p>
              )}
              {!achievementLoading && achievement && achievement.byCommercial.length > 0 && (
                <div className="space-y-6 pt-2">
                  {achievement.byCommercial.map((c) => (
                    <div key={c.commercialId} className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-800 sticky top-0 bg-slate-50/95 py-1 -mx-1 px-1">
                        {c.commercialName}
                      </h3>
                      <div className="space-y-4 pl-0">
                        {c.plans.map((plan) => {
                          const pct = plan.totalTarget != null && plan.totalTarget > 0
                            ? plan.totalPercentage
                            : plan.productTargets.length > 0
                              ? plan.productTargets.reduce((s, pt) => s + pt.percentage, 0) / plan.productTargets.length
                              : 0;
                          const barColor = pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-blue-500" : "bg-orange-500";
                          const textColor = pct >= 100 ? "text-green-600" : pct >= 75 ? "text-blue-600" : "text-orange-600";
                          return (
                            <div
                              key={plan.planId}
                              className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-medium text-slate-800">
                                  {plan.brandName ?? "Plan"}
                                </span>
                                {plan.totalTarget != null && (
                                  <span className="text-sm font-medium text-slate-600">
                                    {plan.totalAchieved.toFixed(2)} / {plan.totalTarget.toFixed(2)} KM
                                    <span className={`ml-2 font-semibold ${textColor}`}>
                                      ({plan.totalPercentage.toFixed(1)}%)
                                    </span>
                                  </span>
                                )}
                              </div>
                              {plan.totalTarget != null && (
                                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                    style={{ width: `${Math.min(100, plan.totalPercentage)}%` }}
                                  />
                                </div>
                              )}
                              {plan.productTargets.length > 0 && (
                                <div className="space-y-2 text-sm">
                                  {plan.productTargets.map((pt) => (
                                    <div key={pt.productId} className="flex items-center justify-between text-slate-600">
                                      <span>{pt.productName}</span>
                                      <span>
                                        {pt.quantityAchieved} / {pt.quantityTarget} kom
                                        <span className={`ml-2 ${pt.percentage >= 100 ? "text-green-600" : pt.percentage >= 75 ? "text-blue-600" : "text-orange-600"}`}>
                                          ({pt.percentage.toFixed(0)}%)
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
