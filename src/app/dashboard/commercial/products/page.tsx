"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

export default function CommercialProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    try {
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
    } catch (error) {
      showToast("Greška pri učitavanju proizvoda.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lager proizvoda</h1>
          <p className="text-sm text-slate-500">
            Pregled proizvoda i zaliha (samo čitanje).
          </p>
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
    </div>
  );
}

