"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  stock: number | null;
};

type Movement = {
  id: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  batch: {
    id: string;
    type: "purchase" | "sale";
    client_provider: string;
    created_at: string;
  };
};

export default function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (productError) {
        toast.error(productError.message);
        setLoading(false);
        return;
      }

      setProduct(productData);

      const { data: movementsData, error: movementsError } = await supabase
        .from("batch_items")
        .select(`
          *,
          batch:batches (
            id,
            type,
            client_provider,
            created_at
          )
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: true });

      if (movementsError) {
        toast.error(movementsError.message);
        setLoading(false);
        return;
      }

      setMovements(movementsData || []);
      setLoading(false);
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="text-center text-xl font-semibold text-slate-700">
          Cargando movimientos...
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="text-center text-xl font-semibold text-red-600">
          Producto no encontrado
        </div>
      </main>
    );
  }

  let runningStock = 0;

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Kardex de inventario</h1>

            <p className="mt-2 text-slate-600">
              Historial completo de movimientos del producto.
            </p>
          </div>

          <Link
            href="/inventory"
            className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Volver
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">SKU</p>

            <h2 className="mt-2 text-2xl font-bold">
              {product.sku}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Producto inventario
            </p>

            <h2 className="mt-2 text-lg font-bold">
              {product.description}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Producto factura
            </p>

            <h2 className="mt-2 text-lg font-bold">
              {product.invoice_description || "-"}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Stock actual
            </p>

            <h2 className="mt-2 text-4xl font-bold text-blue-700">
              {Number(product.stock || 0)}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Movimientos del producto
            </h2>

            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Movimientos: {movements.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-left">Cliente / Proveedor</th>
                  <th className="p-4 text-center">Entrada</th>
                  <th className="p-4 text-center">Salida</th>
                  <th className="p-4 text-center">Existencia</th>
                  <th className="p-4 text-center">Precio unitario</th>
                  <th className="p-4 text-center">Total</th>
                  <th className="p-4 text-center">Lote</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => {
                  const isPurchase =
                    movement.batch.type === "purchase";

                  const entry = isPurchase
                    ? Number(movement.quantity)
                    : 0;

                  const exit = !isPurchase
                    ? Number(movement.quantity)
                    : 0;

                  runningStock += entry - exit;

                  return (
                    <tr
                      key={movement.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        {new Date(
                          movement.batch.created_at
                        ).toLocaleString("es-MX")}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            isPurchase
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {isPurchase ? "COMPRA" : "VENTA"}
                        </span>
                      </td>

                      <td className="p-4 font-medium">
                        {movement.batch.client_provider}
                      </td>

                      <td className="p-4 text-center font-bold text-blue-700">
                        {entry > 0 ? entry : "-"}
                      </td>

                      <td className="p-4 text-center font-bold text-red-600">
                        {exit > 0 ? exit : "-"}
                      </td>

                      <td className="p-4 text-center text-lg font-bold">
                        {runningStock}
                      </td>

                      <td className="p-4 text-center">
                        $
                        {Number(
                          movement.unit_price
                        ).toFixed(2)}
                      </td>

                      <td className="p-4 text-center font-bold text-green-700">
                        $
                        {Number(movement.total).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        <Link
                          href={`/batches/${movement.batch.id}`}
                          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Ver lote
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                //

                {movements.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-slate-500"
                    >
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