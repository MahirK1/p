import { OrdersTable } from "@/components/orders/OrdersTable";

export default function OrderManagerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pregled narudžbi</h1>
        <p className="text-sm text-slate-500">
          Filtriraj narudžbe po datumu, komercijalisti i klijentu. Ovdje ćemo
          omogućiti download i promjenu statusa.
        </p>
      </div>
      <OrdersTable />
    </div>
  );
}