"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Batch = {
  id: string;
  type: "purchase" | "sale";
  client_provider: string;
  created_at: string;
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  const loadBatches = async () => {
    const { data } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false });

    setBatches(data || []);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Historial de lotes</h1>
          <p className="mt-2 text-slate-600">
            Consulta compras y ventas capturadas.
          </p>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-lg">
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
                      No hay lotes registrados
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