"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TrashIcon } from "@heroicons/react/24/outline";

type Brand = { id: string; name: string };
type Plan = {
  id: string;
  month: number;
  year: number;
  totalTarget: number;
  brand?: { name: string } | null;
};

export default function ManagerPlansPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    brandId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    totalTarget: "",
  });
  const { showToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [brandsRes, plansRes] = await Promise.all([
        fetch("/api/brands"),
        fetch("/api/plans"),
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

      if (!brandsRes.ok) {
        throw new Error(await getErrorText(brandsRes));
      }
      if (!plansRes.ok) {
        throw new Error(await getErrorText(plansRes));
      }

      const [brandsData, plansData] = await Promise.all([
        brandsRes.json(),
        plansRes.json(),
      ]);

      setBrands(brandsData);
      setPlans(plansData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      showToast("Greška pri učitavanju: " + (error.message || String(error)), "error");
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        totalTarget: Number(form.totalTarget),
      }),
    });
    if (res.ok) {
      setFormOpen(false);
      setForm({
        brandId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalTarget: "",
      });
      await load();
      showToast("Plan je uspješno kreiran!", "success");
    } else {
      const err = await res.json();
      showToast("Greška: " + (err.error || err), "error");
    }
  };

  const onDelete = async (planId: string) => {
    if (!confirm("Da li ste sigurni da želite obrisati ovaj plan? Sve dodele će također biti obrisane.")) {
      return;
    }

    try {
      const res = await fetch(`/api/plans?id=${planId}`, {
        method: "DELETE",
      });

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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mjesečni planovi</h1>
          <p className="text-sm text-slate-500">
            Kreiraj planove po brendovima ili globalno za sve.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Novi plan
        </button>
      </header>

      {formOpen && (
        <form
          onSubmit={onCreate}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Brend</label>
              <select
                value={form.brandId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brandId: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Bez brenda (globalno)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Mjesec</label>
              <input
                type="number"
                min={1}
                max={12}
                value={form.month}
                onChange={(e) =>
                  setForm((f) => ({ ...f, month: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Godina</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">
              Ukupni target (KM)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.totalTarget}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalTarget: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              onClick={() => setFormOpen(false)}
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
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700">Postojeći planovi</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="md" />
            </div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Nema planova.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Brend</th>
                  <th className="px-4 py-3 text-left">Mjesec / Godina</th>
                  <th className="px-4 py-3 text-right">Ukupni target</th>
                  <th className="px-4 py-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {p.brand?.name ?? "Globalno"}
                    </td>
                    <td className="px-4 py-3">
                      {p.month}.{p.year}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(p.totalTarget).toFixed(2)} KM
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(p.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Obriši
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}