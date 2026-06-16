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

type FixedExpense = {
  id: string;
  concept: string;
  amount: number;
};

const DEFAULT_REPORT_TITLE = "REPORTE GENERAL DE UTILIDADES";
const DRAFT_KEY = "secorsa-profit-pdf-report-draft";

export default function ProfitPdfReportPage() {
  const [reports, setReports] = useState<ProfitReport[]>([]);
  const [items, setItems] = useState<ProfitReportItem[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [reportTitle, setReportTitle] = useState(DEFAULT_REPORT_TITLE);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [expenseConcept, setExpenseConcept] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);
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
    const loadedItems = itemsData || [];

    setReports(loadedReports);
    setItems(loadedItems);

    try {
      const draft = localStorage.getItem(DRAFT_KEY);

      if (draft) {
        const parsed = JSON.parse(draft);

        if (parsed.reportTitle) {
          setReportTitle(parsed.reportTitle);
        }

        if (Array.isArray(parsed.fixedExpenses)) {
          setFixedExpenses(
            parsed.fixedExpenses.map((expense: FixedExpense) => ({
              id: expense.id,
              concept: expense.concept || "",
              amount: Number(expense.amount || 0),
            }))
          );
        }

        if (Array.isArray(parsed.selectedReportIds)) {
          const validIds = new Set(loadedReports.map((report) => report.id));
          setSelectedReportIds(
            parsed.selectedReportIds.filter((id: string) => validIds.has(id))
          );
        } else {
          setSelectedReportIds(loadedReports.map((report) => report.id));
        }
      } else {
        setSelectedReportIds(loadedReports.map((report) => report.id));
      }
    } catch {
      setSelectedReportIds(loadedReports.map((report) => report.id));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  useEffect(() => {
    if (loading) return;

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        reportTitle,
        selectedReportIds,
        fixedExpenses,
      })
    );
  }, [reportTitle, selectedReportIds, fixedExpenses, loading]);

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

  const addExpense = () => {
    if (!expenseConcept.trim()) {
      toast.error("Captura el concepto del gasto");
      return;
    }

    if (Number(expenseAmount) <= 0) {
      toast.error("Captura un monto válido");
      return;
    }

    setFixedExpenses([
      ...fixedExpenses,
      {
        id: `${Date.now()}`,
        concept: expenseConcept.trim().toUpperCase(),
        amount: Number(expenseAmount),
      },
    ]);

    setExpenseConcept("");
    setExpenseAmount(0);
    toast.success("Gasto fijo agregado");
  };

  const updateExpense = (
    index: number,
    field: "concept" | "amount",
    value: string | number
  ) => {
    const updated = [...fixedExpenses];

    if (field === "concept") {
      updated[index].concept = String(value).toUpperCase();
    } else {
      updated[index].amount = Number(value || 0);
    }

    setFixedExpenses(updated);
  };

  const removeExpense = (index: number) => {
    setFixedExpenses(fixedExpenses.filter((_, i) => i !== index));
  };

  const clearExpenses = () => {
    const confirmClear = window.confirm("¿Deseas limpiar todos los gastos fijos?");
    if (!confirmClear) return;

    setFixedExpenses([]);
  };

  const selectedReports = useMemo(() => {
    return reports.filter((report) => selectedReportIds.includes(report.id));
  }, [reports, selectedReportIds]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedReportIds.includes(item.report_id));
  }, [items, selectedReportIds]);

  const totalSales = selectedReports.reduce(
    (acc, report) => acc + Number(report.total_sales || 0),
    0
  );

  const totalPurchases = selectedReports.reduce(
    (acc, report) => acc + Number(report.total_purchases || 0),
    0
  );

  const grossProfit = totalSales - totalPurchases;

  const fixedExpensesTotal = fixedExpenses.reduce(
    (acc, expense) => acc + Number(expense.amount || 0),
    0
  );

  const netProfit = grossProfit - fixedExpensesTotal;

  const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

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

    const cleanTitle = reportTitle.trim() || DEFAULT_REPORT_TITLE;
    const oldTitle = document.title;

    document.title = cleanTitle
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "_");

    window.print();

    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
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
        @page {
            size: A4 landscape;
            margin: 10mm;
        }

        @media print {
            aside {
            display: none !important;
            }

            main {
            margin-left: 0 !important;
            }

            body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 12px !important;
            }

            .overflow-x-auto {
            overflow: visible !important;
            }

            table {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
            font-size: 10px !important;
            }

            thead {
            display: table-header-group;
            }

            tr {
            page-break-inside: avoid;
            page-break-after: auto;
            }

            th,
            td {
            padding: 6px !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            vertical-align: top !important;
            }

            h1 {
            font-size: 22px !important;
            }

            h2 {
            font-size: 16px !important;
            }

            .rounded-2xl,
            .rounded-xl {
            border-radius: 8px !important;
            }
        }
        `}</style>

      <main className="print-page min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Reporte PDF de utilidades</h1>

              <p className="mt-2 text-slate-600">
                Selecciona lotes, asigna título y agrega gastos fijos.
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
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Título del reporte PDF
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 bg-white p-4 text-lg font-bold text-slate-900 outline-none focus:border-black"
                placeholder="Ej. REPORTE DE UTILIDAD ENERO 2026"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
              />
            </div>

            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              <table className="w-full">
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

          <section className="no-print rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Gastos fijos del reporte</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Estos gastos no afectan la utilidad por producto. Solo se
                  descuentan para calcular utilidad neta.
                </p>
              </div>

              <button
                onClick={clearExpenses}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
              >
                Limpiar gastos
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_160px]">
              <input
                className="rounded-xl border border-slate-300 bg-white p-4 font-semibold outline-none focus:border-black"
                placeholder="Concepto del gasto. Ej. RENTA, LUZ, NÓMINA"
                value={expenseConcept}
                onChange={(e) => setExpenseConcept(e.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-slate-300 bg-white p-4 text-center font-bold outline-none focus:border-black"
                placeholder="Monto"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
              />

              <button
                onClick={addExpense}
                className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Agregar
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">Concepto</th>
                    <th className="p-4 text-center">Monto</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {fixedExpenses.map((expense, index) => (
                    <tr key={expense.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">
                        <input
                          className="w-full rounded-lg border border-slate-300 p-2 font-semibold"
                          value={expense.concept}
                          onChange={(e) =>
                            updateExpense(index, "concept", e.target.value)
                          }
                        />
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-40 rounded-lg border border-slate-300 p-2 text-center font-bold"
                          value={expense.amount}
                          onChange={(e) =>
                            updateExpense(
                              index,
                              "amount",
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeExpense(index)}
                          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {fixedExpenses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No hay gastos fijos agregados.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-100">
                    <td className="p-4 text-right font-bold">
                      TOTAL GASTOS FIJOS
                    </td>

                    <td className="p-4 text-center font-bold text-red-600">
                      {money(fixedExpensesTotal)}
                    </td>

                    <td />
                  </tr>
                </tfoot>
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
                {reportTitle.trim() || DEFAULT_REPORT_TITLE}
              </h1>

              <p className="mt-2 text-slate-600">SECORSA Inventory SaaS</p>

              <p className="mt-1 text-sm text-slate-500">
                Reportes incluidos: {selectedReports.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Generado: {new Date().toLocaleString("es-MX")}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-7">
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
                <p className="text-sm text-slate-500">Utilidad bruta</p>
                <h2
                  className={`mt-2 text-2xl font-bold ${
                    grossProfit >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {money(grossProfit)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Gastos fijos</p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {money(fixedExpensesTotal)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Utilidad neta</p>
                <h2
                  className={`mt-2 text-2xl font-bold ${
                    netProfit >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {money(netProfit)}
                </h2>
              </div>

              <div className="rounded-xl border border-slate-300 p-5">
                <p className="text-sm text-slate-500">Margen neto</p>
                <h2
                  className={`mt-2 text-2xl font-bold ${
                    netMargin >= 0 ? "text-slate-900" : "text-red-600"
                  }`}
                >
                  {netMargin.toFixed(2)}%
                </h2>
              </div>
            </div>
          </section>

          <section className="print-card rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-bold">Resultado financiero</h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-semibold">Ventas totales</td>
                    <td className="p-4 text-right font-bold text-green-700">
                      {money(totalSales)}
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-semibold">Compras / costo</td>
                    <td className="p-4 text-right font-bold text-blue-700">
                      {money(totalPurchases)}
                    </td>
                  </tr>

                  <tr className="border-b bg-slate-50">
                    <td className="p-4 font-bold">
                      Utilidad bruta / margen bruto
                    </td>
                    <td
                      className={`p-4 text-right font-bold ${
                        grossProfit >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {money(grossProfit)} / {grossMargin.toFixed(2)}%
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-semibold">Gastos fijos</td>
                    <td className="p-4 text-right font-bold text-red-600">
                      {money(fixedExpensesTotal)}
                    </td>
                  </tr>

                  <tr className="bg-slate-900 text-white">
                    <td className="p-4 text-xl font-bold">
                      Utilidad neta / margen neto
                    </td>
                    <td className="p-4 text-right text-xl font-bold">
                      {money(netProfit)} / {netMargin.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="print-card rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-bold">
              Gastos fijos incluidos
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 text-left">Concepto</th>
                    <th className="p-3 text-center">Monto</th>
                  </tr>
                </thead>

                <tbody>
                  {fixedExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b">
                      <td className="p-3 font-semibold">{expense.concept}</td>
                      <td className="p-3 text-center font-bold text-red-600">
                        {money(expense.amount)}
                      </td>
                    </tr>
                  ))}

                  {fixedExpenses.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-6 text-center text-slate-500">
                        Sin gastos fijos agregados.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-100">
                    <td className="p-3 text-right font-bold">
                      TOTAL GASTOS FIJOS
                    </td>
                    <td className="p-3 text-center font-bold text-red-600">
                      {money(fixedExpensesTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="print-card rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-5 text-2xl font-bold">
              Lotes de utilidad incluidos
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 text-left">Título</th>
                    <th className="p-3 text-center">Periodo</th>
                    <th className="p-3 text-center">Ventas</th>
                    <th className="p-3 text-center">Compras</th>
                    <th className="p-3 text-center">Utilidad bruta</th>
                    <th className="p-3 text-center">Margen bruto</th>
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
                <table className="w-full">
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
                <table className="w-full">
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
                  <table className="w-full">
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

                          <td className="p-3">{item.description || ""}</td>

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