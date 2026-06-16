"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import Link from "next/link";

type ProfitReport = {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  total_purchases: number | null;
  total_sales: number | null;
  total_profit: number | null;
  margin: number | null;
  created_at: string;
};

type ProfitReportItem = {
  id: string;
  report_id: string;
  sku: string | null;
  description: string | null;
  invoice_description: string | null;
  purchase_amount: number | null;
  sale_amount: number | null;
  profit: number | null;
  margin: number | null;
};

export default function ProfitPdfReportPage() {
  const [reports, setReports] = useState<ProfitReport[]>([]);
  const [items, setItems] = useState<ProfitReportItem[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]); 
  const [reportTitle, setReportTitle] = useState("REPORTE GENERAL DE UTILIDADES")
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);

    const { data: reportsData, error: reportsError } = await supabase
      .from("profit_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsError) {
      toast.error(reportsError.message);
      setLoading(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("profit_report_items")
      .select("*");

    if (itemsError) {
      toast.error(itemsError.message);
      setLoading(false);
      return;
    }

    const loadedReports = reportsData || [];

    setReports(loadedReports);
    setItems(itemsData || []);
    setSelectedReportIds(loadedReports.map((report) => report.id));
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  const money = (value: number) => {
    return `$${Number(value || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const toggleReport = (reportId: string) => {
    setSelectedReportIds((current) => {
      if (current.includes(reportId)) {
        return current.filter((id) => id !== reportId);
      }

      return [...current, reportId];
    });
  };

  const selectAllReports = () => {
    setSelectedReportIds(reports.map((report) => report.id));
  };

  const clearSelection = () => {
    setSelectedReportIds([]);
  };

  const selectedReports = reports.filter((report) =>
    selectedReportIds.includes(report.id)
  );

  const selectedItems = items.filter((item) =>
    selectedReportIds.includes(item.report_id)
  );

  const totalSales = selectedReports.reduce(
    (acc, report) => acc + Number(report.total_sales || 0),
    0
  );

  const totalPurchases = selectedReports.reduce(
    (acc, report) => acc + Number(report.total_purchases || 0),
    0
  );

  const totalProfit = totalSales - totalPurchases;

  const generalMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        sku: string;
        description: string;
        sales: number;
        purchases: number;
        profit: number;
      }
    >();

    for (const item of selectedItems) {
      const key = item.sku || "SIN SKU";

      const current = map.get(key) || {
        sku: key,
        description: item.description || "",
        sales: 0,
        purchases: 0,
        profit: 0,
      };

      current.sales += Number(item.sale_amount || 0);
      current.purchases += Number(item.purchase_amount || 0);
      current.profit += Number(item.profit || 0);

      map.set(key, current);
    }

    return Array.from(map.values());
  }, [selectedItems]);

  const mostProfitableProducts = productSummary
    .filter((product) => product.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const lossProducts = productSummary
    .filter((product) => product.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 10);

  const printPdf = () => {
    if (selectedReportIds.length === 0) {
      toast.error("Selecciona al menos un lote de utilidad");
      return;
    }

    const cleanTitle = 
        reportTitle.trim() || "REPORTE GENERAL DE UTILIDADES"
    
    const oldTitle = document.title;

    document.title = cleanTitle
        .replaceAll(" ", "_")
        .replaceAll("/", "-")
        .replaceAll("\\","-")

    window.print();

    setTimeout(() => {
        document.title= oldTitle;
    } ,1000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="text-center text-xl font-semibold">
          Generando reporte de utilidad...
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          aside {
            display: none !important;
          }

          main {
            margin-left: 0 !important;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            background: white !important;
            padding: 0 !important;
          }

          .print-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <main className="print-page min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                Reporte PDF de utilidades
              </h1>

              <p className="mt-2 text-slate-600">
                Selecciona los lotes de utilidad que deseas incluir en el PDF.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/profit/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver dashboard
              </Link>

              <button
                onClick={loadReport}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Actualizar
              </button>

              <button
                onClick={printPdf}
                className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Exportar PDF
              </button>
            </div>
          </div>

          <section className="no-print rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="mb-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-600">
                        Título del reporte PDF
                    </label>

                    <input
                        className="w-full rounded-xl border border-slate-300 bg-white p-4 text-lg font-bold text-slate-900 outline-none focus:border-black"
                        placeholder="Ej. Reporte de utilidad enero 2026"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                    />
             </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Seleccionar lotes de utilidad
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Seleccionados: {selectedReportIds.length} de {reports.length}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={selectAllReports}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Seleccionar todos
                </button>

                <button
                  onClick={clearSelection}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                >
                  Limpiar selección
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-center">Incluir</th>
                    <th className="p-4 text-left">Título</th>
                    <th className="p-4 text-center">Periodo</th>
                    <th className="p-4 text-center">Ventas</th>
                    <th className="p-4 text-center">Compras</th>
                    <th className="p-4 text-center">Utilidad</th>
                    <th className="p-4 text-center">Margen</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.includes(report.id)}
                          onChange={() => toggleReport(report.id)}
                          className="h-5 w-5"
                        />
                      </td>

                      <td className="p-4 font-semibold">
                        {report.title || "ANÁLISIS"}
                        <p className="text-xs font-normal text-slate-500">
                          Creado:{" "}
                          {new Date(report.created_at).toLocaleString("es-MX")}
                        </p>
                      </td>

                      <td className="p-4 text-center">
                        {report.start_date || "-"} / {report.end_date || "-"}
                      </td>

                      <td className="p-4 text-center font-bold text-green-700">
                        {money(Number(report.total_sales || 0))}
                      </td>

                      <td className="p-4 text-center font-bold text-blue-700">
                        {money(Number(report.total_purchases || 0))}
                      </td>

                      <td
                        className={`p-4 text-center font-bold ${
                          Number(report.total_profit || 0) >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {money(Number(report.total_profit || 0))}
                      </td>

                      <td className="p-4 text-center font-bold">
                        {Number(report.margin || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}

                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No hay lotes de utilidad guardados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {selectedReportIds.length === 0 && (
            <section className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-800">
              Selecciona al menos un lote para generar el reporte.
            </section>
          )}

          <section className="print-card rounded-2xl bg-white p-8 shadow-lg">
            <div className="border-b border-slate-300 pb-6">
              <h1 className="text-4xl font-bold text-slate-900">
                {reportTitle.trim() || "REPORTE GENERAL DE UTILIDADES"}
              </h1>

              <p className="mt-2 text-slate-600">
                SECORSA Inventory SaaS
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Reportes incluidos: {selectedReports.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Generado: {new Date().toLocaleString("es-MX")}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-5">
              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Reportes</p>
                <h2 className="mt-2 text-3xl font-bold">
                  {selectedReports.length}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Ventas</p>
                <h2 className="mt-2 text-2xl font-bold text-green-700">
                  {money(totalSales)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Compras</p>
                <h2 className="mt-2 text-2xl font-bold text-blue-700">
                  {money(totalPurchases)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Utilidad</p>
                <h2
                  className={`mt-2 text-2xl font-bold ${
                    totalProfit >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {money(totalProfit)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Margen</p>
                <h2 className="mt-2 text-2xl font-bold">
                  {generalMargin.toFixed(2)}%
                </h2>
              </div>
            </div>
          </section>

          <section className="print-card rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-bold">
              Lotes de utilidad incluidos
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 text-left">Título</th>
                    <th className="p-3 text-center">Periodo</th>
                    <th className="p-3 text-center">Ventas</th>
                    <th className="p-3 text-center">Compras</th>
                    <th className="p-3 text-center">Utilidad</th>
                    <th className="p-3 text-center">Margen</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedReports.map((report) => (
                    <tr key={report.id} className="border-b">
                      <td className="p-3 font-semibold">
                        {report.title || "ANÁLISIS"}
                        <p className="text-xs font-normal text-slate-500">
                          {new Date(report.created_at).toLocaleString("es-MX")}
                        </p>
                      </td>

                      <td className="p-3 text-center">
                        {report.start_date || "-"} / {report.end_date || "-"}
                      </td>

                      <td className="p-3 text-center font-bold text-green-700">
                        {money(Number(report.total_sales || 0))}
                      </td>

                      <td className="p-3 text-center font-bold text-blue-700">
                        {money(Number(report.total_purchases || 0))}
                      </td>

                      <td
                        className={`p-3 text-center font-bold ${
                          Number(report.total_profit || 0) >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {money(Number(report.total_profit || 0))}
                      </td>

                      <td className="p-3 text-center font-bold">
                        {Number(report.margin || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}

                  {selectedReports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No hay lotes seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="print-card rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-5 text-2xl font-bold">
                Productos más rentables
              </h2>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 text-left">SKU</th>
                      <th className="p-3 text-left">Producto</th>
                      <th className="p-3 text-center">Ventas</th>
                      <th className="p-3 text-center">Utilidad</th>
                    </tr>
                  </thead>

                  <tbody>
                    {mostProfitableProducts.map((product) => (
                      <tr key={product.sku} className="border-b">
                        <td className="p-3 font-semibold">{product.sku}</td>
                        <td className="p-3">{product.description}</td>
                        <td className="p-3 text-center">
                          {money(product.sales)}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700">
                          {money(product.profit)}
                        </td>
                      </tr>
                    ))}

                    {mostProfitableProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No hay productos rentables.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print-card rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-5 text-2xl font-bold">
                Productos con pérdida
              </h2>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 text-left">SKU</th>
                      <th className="p-3 text-left">Producto</th>
                      <th className="p-3 text-center">Ventas</th>
                      <th className="p-3 text-center">Utilidad</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lossProducts.map((product) => (
                      <tr key={product.sku} className="border-b">
                        <td className="p-3 font-semibold">{product.sku}</td>
                        <td className="p-3">{product.description}</td>
                        <td className="p-3 text-center">
                          {money(product.sales)}
                        </td>
                        <td className="p-3 text-center font-bold text-red-600">
                          {money(product.profit)}
                        </td>
                      </tr>
                    ))}

                    {lossProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No hay productos con pérdida.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {selectedReports.map((report) => {
            const reportItems = selectedItems.filter(
              (item) => item.report_id === report.id
            );

            return (
              <section
                key={report.id}
                className="print-card rounded-2xl bg-white p-6 shadow-lg"
              >
                <h2 className="text-2xl font-bold">
                  Detalle: {report.title || "ANÁLISIS"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Periodo: {report.start_date || "-"} a {report.end_date || "-"}
                </p>

                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-3 text-left">SKU</th>
                        <th className="p-3 text-left">Producto inventario</th>
                        <th className="p-3 text-left">Producto factura</th>
                        <th className="p-3 text-center">Compras</th>
                        <th className="p-3 text-center">Ventas</th>
                        <th className="p-3 text-center">Utilidad</th>
                        <th className="p-3 text-center">Margen</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reportItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-3 font-semibold">
                            {item.sku || ""}
                          </td>

                          <td className="p-3">
                            {item.description || ""}
                          </td>

                          <td className="p-3">
                            {item.invoice_description || "-"}
                          </td>

                          <td className="p-3 text-center">
                            {money(Number(item.purchase_amount || 0))}
                          </td>

                          <td className="p-3 text-center">
                            {money(Number(item.sale_amount || 0))}
                          </td>

                          <td
                            className={`p-3 text-center font-bold ${
                              Number(item.profit || 0) >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {money(Number(item.profit || 0))}
                          </td>

                          <td className="p-3 text-center font-bold">
                            {Number(item.margin || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}

                      {reportItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-slate-500"
                          >
                            Este análisis no tiene productos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}