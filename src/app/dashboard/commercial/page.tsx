"use client";

import { useEffect, useState, useMemo } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type CommercialAnalytics = {
  year: number;
  month: number;
  totalSales: number;
  salesByDay: { date: string; amount: number }[];
  salesByBrand?: { brandId: string | null; amount: number }[];
  visitsCount: number;
};

type Plan = {
  id: string;
  month: number;
  year: number;
  totalTarget: number;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
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

  // Izračunaj ostvarenje za svaki plan
  const plansWithAchievement = useMemo(() => {
    if (!data || !plans || plans.length === 0) return [];

    // Kreiraj mapu prodaje po brandovima
    const brandSalesMap = new Map<string | null, number>();
    if (data.salesByBrand && Array.isArray(data.salesByBrand)) {
      for (const brandSale of data.salesByBrand) {
        brandSalesMap.set(brandSale.brandId, brandSale.amount);
      }
    }

    return plans.map((plan) => {
      const target = Number(plan.totalTarget) || 0;
      let achieved = 0;

      if (plan.brandId) {
        // Plan po brandu - koristi prodaju za taj brand
        achieved = brandSalesMap.get(plan.brandId) || 0;
      } else {
        // Globalni plan - koristi ukupnu prodaju
        achieved = data.totalSales || 0;
      }

      const percentage = target > 0 ? (achieved / target) * 100 : 0;

      return {
        ...plan,
        achieved,
        percentage: Math.min(100, percentage),
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
  const totalTarget = plans.reduce((sum, p) => sum + (Number(p.totalTarget) || 0), 0);
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

      {/* Targeti i progres */}
      {plansWithAchievement.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Mjesečni targeti ({month}.{year})
          </h2>
          <div className="space-y-4">
            {plansWithAchievement.map((plan) => {
              const target = Number(plan.totalTarget) || 0;
              const achieved = plan.achieved || 0;
              const percentage = plan.percentage || 0;

              return (
                <div key={plan.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {plan.brand?.name ?? "Globalno"}
                    </span>
                    <span className="text-slate-600 font-medium">
                      {achieved.toFixed(2)} / {target.toFixed(2)} KM
                      <span className={`ml-2 ${percentage >= 100 ? 'text-green-600' : percentage >= 75 ? 'text-blue-600' : 'text-orange-600'}`}>
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage >= 100
                          ? "bg-green-500"
                          : percentage >= 75
                          ? "bg-blue-500"
                          : "bg-orange-500"
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
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