"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Batch = {
  id: string;
  type: "purchase" | "sale";
  client_provider: string;
  created_at: string;
};

type BatchItem = {
  id: string;
  product_id: string;
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: batchData } = await supabase
        .from("batches")
        .select("*")
        .eq("id", id)
        .single();

      setBatch(batchData);

      const { data: itemsData } = await supabase
        .from("batch_items")
        .select("*")
        .eq("batch_id", id);

      setItems(itemsData || []);
    };

    loadData();
  }, [id]);

  if (!batch) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="text-center text-xl">Cargando lote...</div>
      </main>
    );
  }

  const totalUnits = items.reduce(
    (acc, item) => acc + Number(item.quantity),
    0
  );

  const totalAmount = items.reduce(
    (acc, item) => acc + Number(item.total),
    0
  );

  const exportToExcel = () => {
    const rows = items.map((item) => ({
      SKU: item.sku,
      DESCRIPCION: item.description,
      CANTIDAD: item.quantity,
      PRECIO_UNITARIO: Number(item.unit_price),
      TOTAL: Number(item.total),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "LOTE");

    const safeClientProvider = batch.client_provider
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_");

    XLSX.writeFile(
      workbook,
      `LOTE_${batch.type === "sale" ? "VENTA" : "COMPRA"}_${safeClientProvider}.xlsx`
    );
  };

  const deleteBatch = async () => {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este lote? Esta acción revertirá el inventario."
    );

    if (!confirmDelete) return;

    setDeleting(true);

    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        toast.error(productError.message);
        setDeleting(false);
        return;
      }

      const currentStock = Number(product?.stock || 0);

      const revertedStock =
        batch.type === "purchase"
          ? currentStock - Number(item.quantity)
          : currentStock + Number(item.quantity);

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: revertedStock,
        })
        .eq("id", item.product_id);

      if (stockError) {
        toast.error(stockError.message);
        setDeleting(false);
        return;
      }
    }

    const { error: itemsError } = await supabase
      .from("batch_items")
      .delete()
      .eq("batch_id", batch.id);

    if (itemsError) {
      toast.error(itemsError.message);
      setDeleting(false);
      return;
    }

    const { error: batchError } = await supabase
      .from("batches")
      .delete()
      .eq("id", batch.id);

    if (batchError) {
      toast.error(batchError.message);
      setDeleting(false);
      return;
    }

    toast.success("Lote eliminado e inventario revertido");
    router.push("/batches");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Detalle del lote</h1>

            <p className="mt-2 text-slate-600">
              Información completa del movimiento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToExcel}
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Exportar Excel
            </button>

            <button
              onClick={deleteBatch}
              disabled={deleting}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Eliminando..." : "Eliminar lote"}
            </button>

            <span
              className={`rounded-full px-5 py-3 text-sm font-bold ${
                batch.type === "sale"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {batch.type === "sale" ? "VENTA" : "COMPRA"}
            </span>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Cliente / Proveedor</p>

            <h2 className="mt-2 text-2xl font-bold">
              {batch.client_provider}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Fecha</p>

            <h2 className="mt-2 text-xl font-bold">
              {new Date(batch.created_at).toLocaleString("es-MX")}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Total unidades</p>

            <h2 className="mt-2 text-3xl font-bold">
              {totalUnits}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Total importe</p>

            <h2 className="mt-2 text-3xl font-bold text-green-700">
              ${totalAmount.toFixed(2)}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Productos del lote</h2>

            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Productos: {items.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Descripción</th>
                  <th className="p-4 text-center">Cantidad</th>
                  <th className="p-4 text-center">Precio unitario</th>
                  <th className="p-4 text-center">Total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-semibold">{item.sku}</td>

                    <td className="p-4">{item.description}</td>

                    <td className="p-4 text-center font-bold">
                      {item.quantity}
                    </td>

                    <td className="p-4 text-center">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>

                    <td className="p-4 text-center font-bold text-green-700">
                      ${Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No hay productos en este lote
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