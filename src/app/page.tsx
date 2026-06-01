"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";

type Batch = {
  id: string;
  type: "purchase" | "sale";
  client_provider: string;
  created_at: string;
};

type Product = {
  id: string;
  sku: string;
  description: string;
  stock: number | null;
};

type BatchItem = {
  id: string;
  quantity: number;
  total: number;
  batches: Batch;
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  const loadDashboard = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, sku, description, stock")
      .order("sku", { ascending: true });

    if (productsError) {
      toast.error(productsError.message);
      return;
    }

    const { data: batchesData, error: batchesError } = await supabase
      .from("batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);

    if (batchesError) {
      toast.error(batchesError.message);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("batch_items")
      .select(`
        id,
        quantity,
        total,
        batches (
          id,
          type,
          client_provider,
          created_at
        )
      `);

    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }

    setProducts(productsData || []);
    setBatches(batchesData || []);
    setBatchItems((itemsData as unknown as BatchItem[]) || []);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (acc, product) => acc + Number(product.stock || 0),
    0
  );

  const totalPurchases = batchItems
    .filter((item) => item.batches?.type === "purchase")
    .reduce((acc, item) => acc + Number(item.total || 0), 0);

  const totalSales = batchItems
    .filter((item) => item.batches?.type === "sale")
    .reduce((acc, item) => acc + Number(item.total || 0), 0);

  const lowStockProducts = products.filter(
    (product) => Number(product.stock || 0) <= 0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Dashboard general</h1>
            <p className="mt-2 text-slate-600">
              Resumen real de ventas, compras, catálogo e inventario.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/batches/new"
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Nuevo lote
            </Link>

            <Link
              href="/catalog"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Catálogo
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Ventas totales</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              ${totalSales.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Compras totales</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              ${totalPurchases.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Productos registrados</p>
            <h2 className="mt-3 text-3xl font-bold">{totalProducts}</h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Unidades en inventario</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {totalStock}
            </h2>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Últimos movimientos
              </h2>

              <Link
                href="/batches"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Ver todos
              </Link>
            </div>

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
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Alertas de inventario
              </h2>

              <Link
                href="/inventory"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Ver inventario
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left">SKU</th>
                    <th className="p-4 text-left">Producto</th>
                    <th className="p-4 text-center">Stock</th>
                  </tr>
                </thead>

                <tbody>
                  {lowStockProducts.slice(0, 8).map((product) => (
                    <tr key={product.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">{product.sku}</td>
                      <td className="p-4">{product.description}</td>
                      <td className="p-4 text-center font-bold text-red-600">
                        {Number(product.stock || 0)}
                      </td>
                    </tr>
                  ))}

                  {lowStockProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No hay productos sin existencia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}