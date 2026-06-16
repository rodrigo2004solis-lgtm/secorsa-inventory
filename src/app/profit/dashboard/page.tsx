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

export default function ProfitDashboardPage() {
  const [reports, setReports] = useState<ProfitReport[]>([]);
  const [items, setItems] = useState<ProfitReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
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

    setReports(reportsData || []);
    setItems(itemsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalSales = reports.reduce(
    (acc, report) => acc + Number(report.total_sales || 0),
    0
  );

  const totalPurchases = reports.reduce(
    (acc, report) => acc + Number(report.total_purchases || 0),
    0
  );

  const totalProfit = totalSales - totalPurchases;

  const generalMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const profitableReports = reports
    .filter((report) => Number(report.total_profit || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.total_profit || 0) - Number(a.total_profit || 0)
    )
    .slice(0, 5);

  const lossReports = reports
    .filter((report) => Number(report.total_profit || 0) < 0)
    .sort(
      (a, b) =>
        Number(a.total_profit || 0) - Number(b.total_profit || 0)
    )
    .slice(0, 5);

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

    for (const item of items) {
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
  }, [items]);

  const mostProfitableProducts = productSummary
    .filter((product) => product.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const lossProducts = productSummary
    .filter((product) => product.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 8);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="text-center text-xl font-semibold">
          Cargando dashboard de utilidades...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Dashboard de utilidades
            </h1>

            <p className="mt-2 text-slate-600">
              Resumen general de análisis de utilidad guardados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/profit"
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Nuevo análisis
            </Link>

            <button
              onClick={loadDashboard}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Reportes guardados
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              {reports.length}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Ventas acumuladas
            </p>

            <h2 className="mt-3 text-3xl font-bold text-green-700">
              ${totalSales.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Compras acumuladas
            </p>

            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              ${totalPurchases.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Utilidad acumulada
            </p>

            <h2
              className={`mt-3 text-3xl font-bold ${
                totalProfit >= 0
                  ? "text-emerald-700"
                  : "text-red-600"
              }`}
            >
              ${totalProfit.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Margen general
            </p>

            <h2
              className={`mt-3 text-3xl font-bold ${
                generalMargin >= 0
                  ? "text-slate-900"
                  : "text-red-600"
              }`}
            >
              {generalMargin.toFixed(2)}%
            </h2>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-semibold">
              Últimos análisis
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">Título</th>
                    <th className="p-4 text-center">Ventas</th>
                    <th className="p-4 text-center">Compras</th>
                    <th className="p-4 text-center">Utilidad</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.slice(0, 8).map((report) => (
                    <tr key={report.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">
                        {report.title || "ANÁLISIS"}
                        <p className="text-xs font-normal text-slate-500">
                          {report.start_date || "-"} a {report.end_date || "-"}
                        </p>
                      </td>

                      <td className="p-4 text-center">
                        ${Number(report.total_sales || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        ${Number(report.total_purchases || 0).toFixed(2)}
                      </td>

                      <td
                        className={`p-4 text-center font-bold ${
                          Number(report.total_profit || 0) >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        ${Number(report.total_profit || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        No hay análisis guardados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-semibold">
              Análisis con pérdida
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">Título</th>
                    <th className="p-4 text-center">Utilidad</th>
                    <th className="p-4 text-center">Margen</th>
                  </tr>
                </thead>

                <tbody>
                  {lossReports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">
                        {report.title || "ANÁLISIS"}
                      </td>

                      <td className="p-4 text-center font-bold text-red-600">
                        ${Number(report.total_profit || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        {Number(report.margin || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}

                  {lossReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No hay análisis con pérdida
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-semibold">
              Productos más rentables
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">SKU</th>
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-center">Utilidad</th>
                  </tr>
                </thead>

                <tbody>
                  {mostProfitableProducts.map((product) => (
                    <tr key={product.sku} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">{product.sku}</td>
                      <td className="p-4">{product.description}</td>
                      <td className="p-4 text-center font-bold text-emerald-700">
                        ${product.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {mostProfitableProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No hay productos rentables registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-semibold">
              Productos con pérdida
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">SKU</th>
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-center">Utilidad</th>
                  </tr>
                </thead>

                <tbody>
                  {lossProducts.map((product) => (
                    <tr key={product.sku} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">{product.sku}</td>
                      <td className="p-4">{product.description}</td>
                      <td className="p-4 text-center font-bold text-red-600">
                        ${product.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {lossProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No hay productos con pérdida registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {profitableReports.length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-semibold">
              Mejores análisis por utilidad
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">Título</th>
                    <th className="p-4 text-center">Periodo</th>
                    <th className="p-4 text-center">Ventas</th>
                    <th className="p-4 text-center">Compras</th>
                    <th className="p-4 text-center">Utilidad</th>
                    <th className="p-4 text-center">Margen</th>
                  </tr>
                </thead>

                <tbody>
                  {profitableReports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">
                        {report.title || "ANÁLISIS"}
                      </td>

                      <td className="p-4 text-center">
                        {report.start_date || "-"} / {report.end_date || "-"}
                      </td>

                      <td className="p-4 text-center">
                        ${Number(report.total_sales || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        ${Number(report.total_purchases || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center font-bold text-emerald-700">
                        ${Number(report.total_profit || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        {Number(report.margin || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}