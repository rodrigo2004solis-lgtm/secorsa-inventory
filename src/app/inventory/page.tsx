"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  keywords: string | null;
  stock: number | null;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sku", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProducts(data || []);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return products;

    return products.filter((product) => {
      return (
        product.sku.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        (product.invoice_description || "").toLowerCase().includes(q) ||
        (product.keywords || "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const totalStock = filteredProducts.reduce(
    (acc, product) => acc + Number(product.stock || 0),
    0
  );

  const productsWithStock = filteredProducts.filter(
    (product) => Number(product.stock || 0) > 0
  ).length;

  const productsWithoutStock = filteredProducts.filter(
    (product) => Number(product.stock || 0) <= 0
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Inventario</h1>

          <p className="mt-2 text-slate-600">
            Consulta existencias actuales por SKU y producto.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Productos mostrados</p>
            <h2 className="mt-2 text-4xl font-bold">
              {filteredProducts.length}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Unidades totales</p>
            <h2 className="mt-2 text-4xl font-bold text-blue-700">
              {totalStock}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Sin existencia</p>
            <h2 className="mt-2 text-4xl font-bold text-red-600">
              {productsWithoutStock}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Existencias actuales
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Con existencia: {productsWithStock} productos
              </p>
            </div>

            <input
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-black md:w-96"
              placeholder="Buscar por SKU, inventario, factura o keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1150px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Producto inventario</th>
                  <th className="p-4 text-left">Producto factura</th>
                  <th className="p-4 text-left">Keywords</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Estatus</th>
                  <th className="p-4 text-center">Movimientos</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const stock = Number(product.stock || 0);

                  return (
                    <tr key={product.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">
                        {product.sku}
                      </td>

                      <td className="p-4 text-slate-700">
                        {product.description}
                      </td>

                      <td className="p-4 text-slate-700">
                        {product.invoice_description || "-"}
                      </td>

                      <td className="p-4 text-slate-500">
                        {product.keywords || "-"}
                      </td>

                      <td className="p-4 text-center text-xl font-bold">
                        {stock}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            stock > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {stock > 0 ? "Disponible" : "Sin existencia"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <Link
                          href={`/inventory/${product.id}`}
                          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Ver movimientos
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No hay productos para mostrar
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