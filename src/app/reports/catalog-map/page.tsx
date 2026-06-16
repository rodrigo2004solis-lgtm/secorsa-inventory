"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

type ProductReport = {
  sku: string;
  description: string;
  invoice_description: string | null;
  keywords: string | null;
};

export default function CatalogMapReportPage() {
  const [products, setProducts] = useState<ProductReport[]>([]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("sku, description, invoice_description, keywords")
      .order("sku", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProducts(data || []);
  };

  const exportExcel = () => {
    const rows = products.map((product) => ({
      "SKU DE PRODUCTO": product.sku,
      "Producto segun inventario": product.description,
      "Producto segun factura": product.invoice_description || "",
      "Palabras clave": product.keywords || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "CATALOGO");

    XLSX.writeFile(workbook, "REPORTE_CATALOGO_PRODUCTOS.xlsx");

    toast.success("Reporte exportado correctamente");
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Reporte catálogo contable
            </h1>

            <p className="mt-2 text-slate-600">
              Consulta y exporta SKU, producto de inventario, producto de factura y palabras clave.
            </p>
          </div>

          <button
            onClick={exportExcel}
            className="rounded-xl bg-black px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Exportar Excel
          </button>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Consulta de productos
            </h2>

            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Total: {products.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU DE PRODUCTO</th>
                  <th className="p-4 text-left">Producto segun inventario</th>
                  <th className="p-4 text-left">Producto segun factura</th>
                  <th className="p-4 text-left">Palabras clave</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.sku} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-semibold">{product.sku}</td>
                    <td className="p-4">{product.description}</td>
                    <td className="p-4">{product.invoice_description || "-"}</td>
                    <td className="p-4">{product.keywords || "-"}</td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
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