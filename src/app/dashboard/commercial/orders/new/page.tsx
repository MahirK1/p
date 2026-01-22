"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

type ClientBranch = {
  id: string;
  erpId?: string | null;
  idBroj?: string | null; // DODAJ OVO
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Client = {
  id: string;
  erpId?: string | null;
  matBroj?: string | null; // DODAJ OVO
  name: string;
  pdvBroj?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  branches?: ClientBranch[];
};

type Product = {
  id: string;
  name: string;
  sku: string;
  catalogNumber?: string | null;
  stock: number;
  price?: number | null;
};

type InvoiceItem = {
  id: string; // Jedinstveni ID za svaku stavku
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
  discountPercent: number; // 0–100
  isGratis: boolean; // Artikal je besplatan
};

function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get("clientId") ?? "";
  const branchId = searchParams?.get("branchId") ?? "";
  const { showToast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [branch, setBranch] = useState<ClientBranch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId) {
      router.push("/dashboard/commercial/orders");
      return;
    }
    async function load() {
      const [clientsRes, productsRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/products"),
      ]);
      const [clientsData, productsData] = await Promise.all([
        clientsRes.json(),
        productsRes.json(),
      ]);

      const foundClient = clientsData.find((c: Client) => c.id === clientId);
      setClient(foundClient ?? null);

      // Ako postoji branchId, pronađi branch
      if (branchId && foundClient?.branches) {
        const foundBranch = foundClient.branches.find((b: ClientBranch) => b.id === branchId);
        setBranch(foundBranch ?? null);
      } else {
        setBranch(null);
      }

      setProducts(productsData);
    }
    load();
  }, [clientId, branchId, router]);

  // Ažuriraj invoiceData useMemo
  const invoiceData = useMemo(() => {
    if (branch) {
      // Ako je branch odabran, koristi podatke branch-a, ali PDV iz client-a
      return {
        name: branch.name,
        address: branch.address || "",
        phone: branch.phone || "",
        id: branch.idBroj || "", // PROMJENA: koristi idBroj umjesto erpId
        pdvBroj: client?.pdvBroj || "",
      };
    } else {
      // Ako nema branch, koristi podatke client-a
      return {
        name: client?.name || "",
        address: client?.address || "",
        phone: client?.phone || "",
        id: client?.matBroj || "", // PROMJENA: koristi matBroj umjesto erpId
        pdvBroj: client?.pdvBroj || "",
      };
    }
  }, [branch, client]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const term = productSearch.toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.catalogNumber ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [products, productSearch]);

  const addProduct = (p: Product, isGratis: boolean = false) => {
    if (p.stock <= 0 && !isGratis) {
      showToast("Zaliha je 0, artikal se ne može dodati.", "warning");
      return;
    }
    setItems((prev) => {
      const basePrice = isGratis ? 0 : Number(p.price ?? 0);
      return [
        ...prev,
        {
          id: `${p.id}-${Date.now()}-${Math.random()}`, // Jedinstveni ID
          productId: p.id,
          product: p,
          quantity: 1,
          price: basePrice,
          discountPercent: 0,
          isGratis: isGratis,
        },
      ];
    });
    setProductSearch("");
  };

  const updateItem = (
    itemId: string,
    field: keyof InvoiceItem,
    value: number | boolean
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // Ako se artikal označi kao gratis, postavi cijenu na 0
          if (field === "isGratis" && value === true) {
            updated.price = 0;
            updated.discountPercent = 0;
          }
          // Ako se artikal označi kao ne-gratis, vrati originalnu cijenu
          if (field === "isGratis" && value === false && item.product) {
            updated.price = Number(item.product.price ?? 0);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const lineTotal = (item: InvoiceItem) => {
    if (item.isGratis) return 0;
    const base = item.price * item.quantity;
    const discount = (base * item.discountPercent) / 100;
    return base - discount;
  };

  const total = items.reduce((acc, item) => acc + lineTotal(item), 0);

  const submitOrder = async () => {
    for (const i of items) {
      const prod = products.find((p) => p.id === i.productId);
      if (!prod) {
        showToast("Proizvod nedostaje u listi.", "error");
        return;
      }
      // Preskoči provjeru zaliha za gratis artikle
      if (!i.isGratis && i.quantity > prod.stock) {
        showToast(`Količina za ${prod.name} premašuje zalihu (${prod.stock}).`, "warning");
        return;
      }
    }
    if (items.length === 0) {
      showToast("Dodaj barem jedan artikal.", "warning");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        branchId: branchId || undefined,
        note,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discountPercent: i.discountPercent || 0,
          price: i.isGratis ? 0 : i.price,
          isGratis: i.isGratis || false,
        })),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      showToast("Narudžba je uspješno poslana!", "success");
      router.push("/dashboard/commercial/orders");
    } else {
      const err = await res.text();
      showToast("Greška: " + err, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-semibold truncate">Nova narudžba</h1>
            <p className="text-xs md:text-sm text-slate-500 truncate">
              {invoiceData.name || "Nepoznat klijent"}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="ml-4 flex-shrink-0 rounded-lg border border-slate-200 px-3 md:px-4 py-2 text-xs md:text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Nazad
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-20">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          {/* PODACI O KLIJENTU - ZAMIJENI postojeći div */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-3">
                Podaci o klijentu
              </p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-lg text-slate-900">
                  {invoiceData.name}
                </p>
                {invoiceData.address && (
                  <p className="text-slate-600">
                    <span className="font-medium">Adresa:</span> {invoiceData.address}
                  </p>
                )}
                {invoiceData.phone && (
                  <p className="text-slate-600">
                    <span className="font-medium">Telefon:</span> {invoiceData.phone}
                  </p>
                )}
                {invoiceData.id && (
                  <p className="text-slate-600">
                    <span className="font-medium">ID:</span> {invoiceData.id}
                  </p>
                )}
                {invoiceData.pdvBroj && (
                  <p className="text-slate-600">
                    <span className="font-medium">PDV:</span> {invoiceData.pdvBroj}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-end justify-end md:justify-start">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  Datum
                </p>
                <p className="text-sm text-slate-600">
                  {new Date().toLocaleDateString("bs-BA")}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Artikal</th>
                  <th className="px-3 py-2 text-right">Količina</th>
                  <th className="px-3 py-2 text-center">Gratis</th>
                  <th className="px-3 py-2 text-right">Rabat %</th>
                  <th className="px-3 py-2 text-right">Cijena</th>
                  <th className="px-3 py-2 text-right">Ukupno</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 align-middle"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-slate-800">
                          {item.product?.name ?? "Artikal"}
                        </div>
                        {item.isGratis && (
                          <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded">
                            GRATIS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {item.product?.sku}{" "}
                        {item.product?.catalogNumber &&
                          `• Kataloški: ${item.product.catalogNumber}`}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.isGratis}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "isGratis",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        title="Označi kao gratis"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "discountPercent",
                            Number(e.target.value)
                          )
                        }
                        disabled={item.isGratis}
                        className={`w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none ${
                          item.isGratis ? "bg-slate-100 cursor-not-allowed opacity-50" : ""
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.isGratis ? (
                        <span className="text-green-600 font-semibold">0.00 KM</span>
                      ) : (
                        item.price ? item.price.toFixed(2) + " KM" : "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {lineTotal(item).toFixed(2)} KM
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-500"
                        onClick={() => removeItem(item.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-sm text-slate-500"
                    >
                      Dodaj artikle ispod da započneš narudžbu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Dodaj artikle ispod da započneš narudžbu.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {item.product?.name ?? "Artikal"}
                        </div>
                        {item.isGratis && (
                          <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded flex-shrink-0">
                            GRATIS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {item.product?.sku}{" "}
                        {item.product?.catalogNumber &&
                          `• Kataloški: ${item.product.catalogNumber}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2"
                      onClick={() => removeItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Količina
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Rabat %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "discountPercent",
                            Number(e.target.value)
                          )
                        }
                        disabled={item.isGratis}
                        className={`w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none ${
                          item.isGratis ? "bg-slate-100 cursor-not-allowed opacity-50" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.isGratis}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "isGratis",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-xs text-slate-600">Gratis</label>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Cijena: {item.isGratis ? (
                        <span className="text-green-600 font-semibold">0.00 KM</span>
                      ) : (
                        item.price ? item.price.toFixed(2) + " KM" : "-"
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Ukupno: {lineTotal(item).toFixed(2)} KM
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Dodaj artikal
            </p>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Pretraži po nazivu, SKU ili kataloškom broju..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">
                    Nema rezultata za zadani pojam.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 transition ${
                        p.stock <= 0 ? "bg-red-50 hover:bg-red-100" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => addProduct(p, false)}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${
                            p.stock <= 0 ? "text-red-700" : "text-slate-800"
                          }`}>
                            {p.name}
                          </div>
                          <div className={`text-xs ${
                            p.stock <= 0 ? "text-red-500" : "text-slate-500"
                          }`}>
                            SKU: {p.sku}{" "}
                            {p.catalogNumber && `• Kataloški: ${p.catalogNumber}`}
                            {p.stock <= 0 && (
                              <span className="ml-2 font-semibold">• Zaliha: 0</span>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <div className={`text-xs font-semibold ${
                          p.stock <= 0 ? "text-red-600" : "text-slate-700"
                        }`}>
                          {p.price ? `${Number(p.price).toFixed(2)} KM` : "-"}
                        </div>
                        <button
                          type="button"
                          onClick={() => addProduct(p, true)}
                          className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded hover:bg-green-100 transition"
                          title="Dodaj kao gratis"
                        >
                          Gratis
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 md:flex-row md:items-start md:justify-between">
            <div className="md:w-1/2">
              <label className="text-sm font-medium text-slate-600">
                Napomena za narudžbu
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Npr. posebni uslovi isporuke..."
              />
            </div>
            {/* Sakrij ovaj div na mobilnim - samo desktop */}
            <div className="hidden md:block space-y-3 md:w-1/3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Ukupno</span>
                <span className="text-lg font-semibold text-slate-900">
                  {total.toFixed(2)} KM
                </span>
              </div>
              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting || items.length === 0}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Šaljem narudžbu..." : "Pošalji narudžbu"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom on mobile, static on desktop */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg md:static md:shadow-none md:border-t-0 md:p-0 md:mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="text-right sm:text-left">
            <p className="text-xs text-slate-500">Ukupno:</p>
            <p className="text-xl font-bold text-slate-900">
              {total.toFixed(2)} KM
            </p>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting || items.length === 0}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Šalje..." : "Pošalji narudžbu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-slate-600">Učitavanje...</p>
          </div>
        </div>
      }
    >
      <NewOrderPageContent />
    </Suspense>
  );
}