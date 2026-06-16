"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

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

export default function ProfitHistoryPage() {
  const [reports, setReports] = useState<ProfitReport[]>([]);

  const loadReports = async () => {
    const { data, error } = await supabase
      .from("profit_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setReports(data || []);
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Historial de utilidad</h1>
            <p className="mt-2 text-slate-600">
              Consulta análisis guardados y abre el detalle editable.
            </p>
          </div>

          <Link
            href="/profit"
            className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Nuevo análisis
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">Título</th>
                  <th className="p-4 text-center">Periodo</th>
                  <th className="p-4 text-center">Ventas</th>
                  <th className="p-4 text-center">Compras</th>
                  <th className="p-4 text-center">Utilidad</th>
                  <th className="p-4 text-center">Margen</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-slate-50">
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

                    <td className="p-4 text-center text-green-700 font-bold">
                      ${Number(report.total_sales || 0).toFixed(2)}
                    </td>

                    <td className="p-4 text-center text-blue-700 font-bold">
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

                    <td className="p-4 text-center font-bold">
                      {Number(report.margin || 0).toFixed(2)}%
                    </td>

                    <td className="p-4 text-center">
                      <Link
                        href={`/profit/${report.id}`}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}

                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No hay análisis guardados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}