"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import jsPDF from "jspdf";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "next-auth/react";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  note?: string | null;
  client: { name: string; address?: string; city?: string; phone?: string; email?: string };
  commercial: { name: string; id: string };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number | null;
    lineTotal: number;
    product: { name: string; sku?: string };
  }>;
};

export default function CommercialOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders?id=${id}`, { cache: "no-store" });
    if (!res.ok) {
      notFound();
      return;
    }
    const data = await res.json();
    
    // Provjeri da li je narudžba od trenutnog komercijaliste
    const userId = (session?.user as any)?.id;
    if (data.commercial?.id !== userId && (session?.user as any)?.role !== "ADMIN") {
      notFound();
      return;
    }
    
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      loadOrder();
    }
  }, [id, session]);

  const downloadPDF = () => {
    if (!order) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    doc.setFontSize(20);
    doc.text("NARUDŽBA", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Broj: ${order.orderNumber}`, margin, yPos);
    yPos += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Klijent: ${order.client.name}`, margin, yPos);
    yPos += 7;
    doc.text(`Komercijalista: ${order.commercial.name}`, margin, yPos);
    yPos += 7;
    doc.text(
      `Datum: ${new Date(order.createdAt).toLocaleDateString("bs-BA")}`,
      margin,
      yPos
    );
    yPos += 10;

    const tableTop = yPos;
    doc.setFontSize(10);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, tableTop, contentWidth, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.text("#", margin + 2, tableTop + 6);
    doc.text("Artikal", margin + 10, tableTop + 6);
    doc.text("Kol.", margin + 75, tableTop + 6);
    doc.text("Cijena", margin + 95, tableTop + 6);
    doc.text("Rabat", margin + 120, tableTop + 6);
    doc.text("Ukupno", margin + 150, tableTop + 6);

    yPos = tableTop + 8;
    doc.setFont("helvetica", "normal");

    order.items.forEach((item: any, i) => {
      if (yPos > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPos = margin;
      }

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 7;

      const discountPercent = item.discountPercent ? Number(item.discountPercent) : 0;
      const baseTotal = Number(item.unitPrice) * item.quantity;
      const discountAmount = (baseTotal * discountPercent) / 100;
      const finalTotal = baseTotal - discountAmount;

      doc.text(`${i + 1}`, margin + 2, yPos);
      doc.text(item.product.name, margin + 10, yPos);
      if (item.product.sku) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`SKU: ${item.product.sku}`, margin + 10, yPos + 4);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
      }
      doc.text(`${item.quantity}`, margin + 75, yPos, { align: "right" });
      doc.text(`${Number(item.unitPrice).toFixed(2)} KM`, margin + 95, yPos, { align: "right" });
      
      if (discountPercent > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(`${discountPercent.toFixed(2)}%`, margin + 120, yPos, { align: "right" });
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text("-", margin + 120, yPos, { align: "right" });
      }
      
      doc.text(`${finalTotal.toFixed(2)} KM`, margin + 150, yPos, { align: "right" });

      yPos += item.product.sku ? 10 : 7;
    });

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    if (order.note) {
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Napomena komercijaliste:", margin, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitNote = doc.splitTextToSize(order.note, contentWidth);
      splitNote.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 5;
    }
    
    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("UKUPNO:", margin + 120, yPos);
    doc.text(`${Number(order.totalAmount).toFixed(2)} KM`, margin + 150, yPos, { align: "right" });

    doc.save(`narudzba-${order.orderNumber}.pdf`);
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statusLabel = (status: string) =>
    status === "PENDING"
      ? "Proslijeđeno"
      : status === "APPROVED"
      ? "Prihvaćeno"
      : status === "COMPLETED"
      ? "Završeno"
      : status === "CANCELED"
      ? "Otkazano"
      : status;

  const statusColor = (status: string) =>
    status === "PENDING"
      ? "bg-amber-100 text-amber-700"
      : status === "APPROVED"
      ? "bg-blue-100 text-blue-700"
      : status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "CANCELED"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <span>←</span>
          Nazad na listu
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Printaj
          </button>
          <button
            onClick={downloadPDF}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="invoice-container rounded-2xl border border-slate-200 bg-white shadow-sm print:border-none print:shadow-none print:rounded-none">
        <div className="border-b border-slate-100 px-8 py-6 print:px-4 print:py-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 print:text-[10px]">
                Narudžba
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 print:text-lg print:mt-0">
                {order.orderNumber}
              </h1>
            </div>
            <div className="text-right print:hidden">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 px-8 py-6 print:px-4 print:py-2 print:border-b-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 print:text-[9px]">
                Klijent
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 print:text-xs print:mt-1">
                {order.client?.name}
              </div>
              {order.client?.address && (
                <div className="mt-1 text-sm text-slate-600 print:text-[10px] print:mt-0.5">{order.client.address}</div>
              )}
              {order.client?.city && (
                <div className="text-sm text-slate-600 print:text-[10px]">{order.client.city}</div>
              )}
              {order.client?.phone && (
                <div className="mt-1 text-sm text-slate-600 print:text-[10px] print:mt-0.5">{order.client.phone}</div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 print:text-[9px]">
                Komercijalista
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 print:text-xs print:mt-1">
                {order.commercial?.name}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 print:text-[9px]">
                Datum izdavanja
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900 print:text-xs print:mt-1">
                {new Date(order.createdAt).toLocaleDateString("bs-BA", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 print:px-2 print:py-2">
          <div className="overflow-x-auto">
            <table className="min-w-full print:text-xs">
              <thead>
                <tr className="border-b border-slate-200 print:border-b-2">
                  <th className="px-6 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    #
                  </th>
                  <th className="px-6 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    Artikal
                  </th>
                  <th className="px-6 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    Kol.
                  </th>
                  <th className="px-6 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    Cijena
                  </th>
                  <th className="px-6 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    Rabat
                  </th>
                  <th className="px-6 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 print:px-2 print:pb-1 print:text-[10px]">
                    Ukupno
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-y-0">
                {order.items.map((item: any, i: number) => {
                  const discountPercent = item.discountPercent ? Number(item.discountPercent) : 0;
                  const baseTotal = Number(item.unitPrice) * item.quantity;
                  const discountAmount = (baseTotal * discountPercent) / 100;
                  const finalTotal = baseTotal - discountAmount;
                  
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50/50 print:hover:bg-transparent print:border-b print:border-slate-200">
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 print:px-2 print:py-1 print:text-[10px]">{i + 1}</td>
                      <td className="px-6 py-4 print:px-2 print:py-1">
                        <div className="text-sm font-semibold text-slate-900 print:text-[10px] print:font-medium">
                          {item.product.name}
                        </div>
                        {item.product.sku && (
                          <div className="mt-0.5 text-xs text-slate-500 print:text-[8px] print:mt-0">{item.product.sku}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-900 print:px-2 print:py-1 print:text-[10px]">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600 print:px-2 print:py-1 print:text-[10px]">
                        {Number(item.unitPrice).toFixed(2)} KM
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600 print:px-2 print:py-1 print:text-[10px]">
                        {discountPercent > 0 ? (
                          <span className="font-medium text-emerald-600">
                            -{discountPercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 print:px-2 print:py-1 print:text-[10px]">
                        {finalTotal.toFixed(2)} KM
                        {discountPercent > 0 && (
                          <div className="mt-0.5 text-xs font-normal text-slate-400 line-through print:hidden">
                            {baseTotal.toFixed(2)} KM
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {order.note && (
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 px-6 py-4 print:mt-3 print:border print:border-slate-300 print:bg-white print:px-3 print:py-2 print:rounded-none">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 print:text-[9px] print:text-slate-700">
                Napomena komercijaliste
              </div>
              <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap print:text-[10px] print:mt-1">
                {order.note}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end border-t-2 border-slate-200 pt-6 print:mt-4 print:pt-2 print:border-t">
            <div className="w-full max-w-xs print:max-w-none">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-700 print:text-sm">Ukupno:</span>
                <span className="text-2xl font-bold text-slate-900 print:text-lg">
                  {Number(order.totalAmount).toFixed(2)} KM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

