"use client";

import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price?: number | null;
  brand?: { name: string } | null;
};

type Client = { id: string; name: string };

type OrderItem = {
  productId: string;
  quantity: number;
  product?: Product;
};

export function OrderForm({ onCreated }: { onCreated?: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [clientsRes, productsRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/products"),
      ]);
      const [clientsData, productsData] = await Promise.all([
        clientsRes.json(),
        productsRes.json(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setLoading(false);
    }
    load();
  }, []);

  const availableProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.brand?.name ?? ""}`.toLowerCase().includes(term)
    );
  }, [products, search]);

  const addItem = (product: Product) => {
    if (product.stock <= 0) {
      alert("Zaliha je 0, artikal se ne može dodati.");
      return;
    }
    setItems((prev) => {
      if (prev.find((item) => item.productId === product.id)) return prev;
      return [...prev, { productId: product.id, quantity: 1, product }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const total = items.reduce((acc, item) => {
    const price = Number(item.product?.price ?? 0);
    return acc + price * item.quantity;
  }, 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) {
      alert("Odaberite klijenta i dodajte barem jednu stavku.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setClientId("");
      setItems([]);
      onCreated?.();
      alert("Narudžba je uspješno kreirana!");
    } else {
      const err = await res.text();
      alert("Greška: " + err);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Učitavanje...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-600">
          Klijent (apoteka)
        </label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">Odaberi klijenta</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Dodaj proizvode iz lagera
            </p>
            <p className="text-xs text-slate-500">
              Pretraži po nazivu, SKU ili brendu i klikni da dodaš u narudžbu.
            </p>
          </div>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:max-w-xs"
            placeholder="Pretraga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {availableProducts.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">
              Nema proizvoda za zadani pojam.
            </div>
          ) : (
            availableProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => addItem(product)}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    SKU: {product.sku} · Brend: {product.brand?.name ?? "-"}
                  </p>
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {product.price ? `${Number(product.price).toFixed(2)} KM` : "-"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="text-sm font-semibold text-blue-700 mb-3">
            Stavke narudžbe
          </h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium">
                    {item.product?.name ?? "Proizvod"}
                  </p>
                  <p className="text-xs text-slate-500">
                    SKU: {item.product?.sku} · Na lageru:{" "}
                    {item.product?.stock ?? 0}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.productId, Number(e.target.value))
                    }
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="text-sm font-semibold text-slate-800">
                    {item.product?.price
                      ? `${(Number(item.product.price) * item.quantity).toFixed(
                          2
                        )} KM`
                      : "-"}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-red-500"
                    onClick={() => removeItem(item.productId)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>Ukupno</span>
            <span>{total.toFixed(2)} KM</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className={classNames(
            "rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500",
            (submitting || items.length === 0) &&
              "opacity-60 cursor-not-allowed"
          )}
        >
          {submitting ? "Šaljem..." : "Pošalji narudžbu"}
        </button>
      </div>
    </form>
  );
}