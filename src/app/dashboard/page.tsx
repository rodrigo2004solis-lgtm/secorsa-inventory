"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Batch = {
  id: string;
  type: "purchase" | "sale";
  client_provider: string;
  created_at: string;
};

export default function DashboardPage() {
  const [productsCount, setProductsCount] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);

  const loadDashboard = async () => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const { data } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    setProductsCount(count || 0);
    setBatches(data || []);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const purchases = batches.filter((b) => b.type === "purchase").length;
  const sales = batches.filter((b) => b.type === "sale").length;

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Resumen general de catálogo, compras y ventas.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Productos registrados</p>
            <h2 className="mt-3 text-4xl font-bold">{productsCount}</h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Compras recientes</p>
            <h2 className="mt-3 text-4xl font-bold text-blue-700">
              {purchases}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Ventas recientes</p>
            <h2 className="mt-3 text-4xl font-bold text-green-700">
              {sales}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-2xl font-semibold">
            Últimos movimientos
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-left">Cliente / Proveedor</th>
                </tr>
              </thead>

              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() => {
                      window.location.href = `/batches/${batch.id}`;
                    }}
                  >
                    <td className="p-4">
                      {new Date(batch.created_at).toLocaleString("es-MX")}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          batch.type === "sale"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {batch.type === "sale" ? "Venta" : "Compra"}
                      </span>
                    </td>

                    <td className="p-4 font-semibold">
                      {batch.client_provider}
                    </td>
                  </tr>
                ))}

                {batches.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-slate-500">
                      No hay movimientos registrados
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