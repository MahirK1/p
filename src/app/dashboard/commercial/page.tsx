"use client";

import { useEffect, useState, useMemo } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type CommercialAnalytics = {
  year: number;
  month: number;
  totalSales: number;
  salesByDay: { date: string; amount: number }[];
  salesByBrand?: { brandId: string | null; amount: number }[];
  salesByProduct?: { productId: string; quantity: number; amount: number }[];
  visitsCount: number;
};

type PlanProductTarget = {
  productId: string;
  quantityTarget: number;
  product?: { id: string; name: string };
};

type Plan = {
  id: string;
  month: number;
  year: number;
  totalTarget?: number | null;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
  productTargets?: PlanProductTarget[];
};

export default function CommercialDashboardPage() {
  const [data, setData] = useState<CommercialAnalytics | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Sigurno dobijanje trenutnog datuma (iOS Safari kompatibilnost)
        let currentYear: number;
        let currentMonth: number;
        try {
          const now = new Date();
          currentYear = now.getFullYear();
          currentMonth = now.getMonth() + 1;
        } catch (dateError) {
          console.error("Error getting current date:", dateError);
          // Fallback na default vrijednosti
          currentYear = 2024;
          currentMonth = 1;
        }
        
        const [analyticsRes, plansRes] = await Promise.all([
          fetch(`/api/analytics/commercial?year=${currentYear}&month=${currentMonth}`).catch(err => {
            console.error("Error fetching analytics:", err);
            return null;
          }),
          fetch(`/api/plans?commercialId=me&year=${currentYear}&month=${currentMonth}`).catch(err => {
            console.error("Error fetching plans:", err);
            return null;
          }),
        ]);
        
        if (!analyticsRes || !analyticsRes.ok) {
          console.error("Error fetching analytics data");
          setData(null);
        } else {
          try {
            const analyticsData = await analyticsRes.json();
            setData(analyticsData);
          } catch (jsonError) {
            console.error("Error parsing analytics JSON:", jsonError);
            setData(null);
          }
        }
        
        if (!plansRes || !plansRes.ok) {
          console.error("Error fetching plans data");
          setPlans([]);
        } else {
          try {
            const plansData = await plansRes.json();
            setPlans(Array.isArray(plansData) ? plansData : []);
          } catch (jsonError) {
            console.error("Error parsing plans JSON:", jsonError);
            setPlans([]);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setData(null);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Izračunaj ostvarenje za svaki plan (KM i po proizvodima – komadi)
  const plansWithAchievement = useMemo(() => {
    if (!data || !plans || plans.length === 0) return [];

    const brandSalesMap = new Map<string | null, number>();
    if (data.salesByBrand && Array.isArray(data.salesByBrand)) {
      for (const brandSale of data.salesByBrand) {
        brandSalesMap.set(brandSale.brandId, brandSale.amount);
      }
    }

    const productQuantityMap = new Map<string, number>();
    if (data.salesByProduct && Array.isArray(data.salesByProduct)) {
      for (const sp of data.salesByProduct) {
        productQuantityMap.set(sp.productId, sp.quantity);
      }
    }

    return plans.map((plan) => {
      const targetKm = plan.totalTarget != null ? Number(plan.totalTarget) : 0;
      let achievedKm = 0;

      if (plan.brandId) {
        achievedKm = brandSalesMap.get(plan.brandId) || 0;
      } else {
        achievedKm = data.totalSales || 0;
      }

      const percentageKm = targetKm > 0 ? (achievedKm / targetKm) * 100 : 0;

      const productAchievement =
        plan.productTargets?.map((pt) => {
          const achieved = productQuantityMap.get(pt.productId) ?? 0;
          const target = pt.quantityTarget;
          const pct = target > 0 ? (achieved / target) * 100 : 0;
          return {
            productId: pt.productId,
            productName: pt.product?.name ?? "",
            quantityTarget: target,
            quantityAchieved: achieved,
            percentage: Math.min(100, pct),
          };
        }) ?? [];

      const avgProductPct =
        productAchievement.length > 0
          ? productAchievement.reduce((s, p) => s + p.percentage, 0) / productAchievement.length
          : 0;
      const displayPercentage = targetKm > 0 ? percentageKm : avgProductPct;

      return {
        ...plan,
        achieved: achievedKm,
        percentage: Math.min(100, displayPercentage),
        productAchievement,
      };
    });
  }, [data, plans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 mb-2">
            Greška pri učitavanju podataka
          </p>
          <p className="text-sm text-slate-600 mb-4">
            Molimo osvježite stranicu ili pokušajte kasnije.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Osvježi stranicu
          </button>
        </div>
      </div>
    );
  }

  const { totalSales, salesByDay, visitsCount, month, year } = data;
  const totalTarget = plans.reduce(
    (sum, p) => sum + (p.totalTarget != null ? Number(p.totalTarget) : 0),
    0
  );
  const totalAchieved = plansWithAchievement.reduce((sum, p) => sum + (p.achieved || 0), 0);
  const totalPercentage = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Moj dashboard</h1>
        <p className="text-sm text-slate-500">
          Rezultati za {month}.{year}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ukupna prodaja</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {(totalSales || 0).toFixed(2)} KM
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Broj posjeta (DONE)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {visitsCount || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Ukupni target ({month}.{year})
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {totalTarget.toFixed(2)} KM
          </p>
          {totalTarget > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {totalPercentage.toFixed(1)}% ostvareno
            </p>
          )}
        </div>
      </div>

      {/* Targeti i progres (KM i po proizvodima) */}
      {plansWithAchievement.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Mjesečni targeti ({month}.{year})
          </h2>
          <div className="space-y-4">
            {plansWithAchievement.map((plan) => {
              const target = plan.totalTarget != null ? Number(plan.totalTarget) : 0;
              const achieved = plan.achieved || 0;
              const percentage = plan.percentage || 0;
              const productAchievement = (plan as any).productAchievement ?? [];

              return (
                <div key={plan.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {plan.brand?.name ?? "Globalno"}
                    </span>
                    {target > 0 && (
                      <span className="text-slate-600 font-medium">
                        {achieved.toFixed(2)} / {target.toFixed(2)} KM
                        <span className={`ml-2 ${percentage >= 100 ? "text-green-600" : percentage >= 75 ? "text-blue-600" : "text-orange-600"}`}>
                          ({percentage.toFixed(1)}%)
                        </span>
                      </span>
                    )}
                  </div>
                  {target > 0 && (
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentage >= 100 ? "bg-green-500" : percentage >= 75 ? "bg-blue-500" : "bg-orange-500"
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  )}
                  {productAchievement.length > 0 && (
                    <div className="ml-2 mt-2 space-y-1.5 text-sm text-slate-600">
                      {productAchievement.map((pt: { productId: string; productName: string; quantityTarget: number; quantityAchieved: number; percentage: number }) => (
                        <div key={pt.productId} className="flex items-center justify-between">
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
      )}

      {/* Prodaja po danima */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Prodaja po danima
        </h2>
        <div className="space-y-1 text-xs text-slate-600">
          {!salesByDay || !Array.isArray(salesByDay) || salesByDay.length === 0 ? (
            <p>Nema prodaje u ovom mjesecu.</p>
          ) : (
            salesByDay.map((d) => {
              if (!d || typeof d.amount !== 'number') return null;
              const amount = Number(d.amount) || 0;
              const maxSales = Number(totalSales) || 1;
              return (
                <div key={d.date || Math.random()} className="flex items-center gap-2">
                  <span className="w-24">{d.date || '—'}</span>
                  <div className="flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.min(100, (amount / maxSales) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-20 text-right font-semibold">
                    {amount.toFixed(2)} KM
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}