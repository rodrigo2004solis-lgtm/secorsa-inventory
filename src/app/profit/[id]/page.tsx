"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  keywords: string | null;
};

type ProfitReport = {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ProfitItem = {
  id: string;
  product_id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  purchase_amount: number;
  sale_amount: number;
};

export default function ProfitEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<ProfitReport | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ProfitItem[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const { data: reportData, error: reportError } = await supabase
      .from("profit_reports")
      .select("id, title, start_date, end_date")
      .eq("id", id)
      .single();

    if (reportError) {
      toast.error(reportError.message);
      return;
    }

    setReport(reportData);

    const { data: itemsData, error: itemsError } = await supabase
      .from("profit_report_items")
      .select("*")
      .eq("report_id", id)
      .order("created_at", { ascending: false });

    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }

    setItems(itemsData || []);

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, sku, description, invoice_description, keywords")
      .order("sku", { ascending: true });

    if (productsError) {
      toast.error(productsError.message);
      return;
    }

    setProducts(productsData || []);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) return [];

    return products
      .filter((product) => {
        return (
          product.sku.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q) ||
          (product.invoice_description || "").toLowerCase().includes(q) ||
          (product.keywords || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [products, query]);

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="text-center text-xl font-semibold">
          Cargando análisis...
        </div>
      </main>
    );
  }

  const updateItem = (
    index: number,
    field: "purchase_amount" | "sale_amount",
    value: number
  ) => {
    if (value < 0) return;

    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addProduct = (product: Product) => {
    const exists = items.find((item) => item.product_id === product.id);

    if (exists) {
      toast.error("Este producto ya está agregado");
      setQuery("");
      return;
    }

    setItems([
      {
        id: `temp-${product.id}`,
        product_id: product.id,
        sku: product.sku,
        description: product.description,
        invoice_description: product.invoice_description,
        purchase_amount: 0,
        sale_amount: 0,
      },
      ...items,
    ]);

    setQuery("");
    toast.success("Producto agregado pendiente de guardar");
  };

  const removeItem = (index: number) => {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas quitar este producto del análisis?"
    );

    if (!confirmDelete) return;

    setItems(items.filter((_, i) => i !== index));
  };

  const totalPurchases = items.reduce(
    (acc, item) => acc + Number(item.purchase_amount || 0),
    0
  );

  const totalSales = items.reduce(
    (acc, item) => acc + Number(item.sale_amount || 0),
    0
  );

  const totalProfit = totalSales - totalPurchases;
  const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const saveChanges = async () => {
    if (items.length === 0) {
      toast.error("El análisis no puede quedar vacío");
      return;
    }

    setSaving(true);

    await supabase
      .from("profit_report_items")
      .delete()
      .eq("report_id", report.id);

    const reportItems = items.map((item) => {
      const profit =
        Number(item.sale_amount || 0) - Number(item.purchase_amount || 0);

      const itemMargin =
        Number(item.sale_amount || 0) > 0
          ? (profit / Number(item.sale_amount || 0)) * 100
          : 0;

      return {
        report_id: report.id,
        product_id: item.product_id,
        sku: item.sku,
        description: item.description,
        invoice_description: item.invoice_description,
        purchase_amount: item.purchase_amount,
        sale_amount: item.sale_amount,
        profit,
        margin: Number(itemMargin.toFixed(2)),
      };
    });

    const { error: itemsError } = await supabase
      .from("profit_report_items")
      .insert(reportItems);

    if (itemsError) {
      toast.error(itemsError.message);
      setSaving(false);
      return;
    }

    const { error: reportError } = await supabase
      .from("profit_reports")
      .update({
        total_purchases: totalPurchases,
        total_sales: totalSales,
        total_profit: totalProfit,
        margin: Number(margin.toFixed(2)),
      })
      .eq("id", report.id);

    if (reportError) {
      toast.error(reportError.message);
      setSaving(false);
      return;
    }

    toast.success("Análisis actualizado");
    setSaving(false);
    loadData();
  };

  const exportExcel = () => {
    const rows = items.map((item) => {
      const profit =
        Number(item.sale_amount || 0) - Number(item.purchase_amount || 0);

      const itemMargin =
        Number(item.sale_amount || 0) > 0
          ? (profit / Number(item.sale_amount || 0)) * 100
          : 0;

      return {
        "Fecha inicial": report.start_date || "",
        "Fecha final": report.end_date || "",
        "Título": report.title || "",
        SKU: item.sku,
        "Producto inventario": item.description,
        "Producto factura": item.invoice_description || "",
        Compras: Number(item.purchase_amount || 0),
        Ventas: Number(item.sale_amount || 0),
        Utilidad: profit,
        "Margen %": Number(itemMargin.toFixed(2)),
      };
    });

    rows.push({
      "Fecha inicial": "",
      "Fecha final": "",
      "Título": "",
      SKU: "",
      "Producto inventario": "TOTALES",
      "Producto factura": "",
      Compras: totalPurchases,
      Ventas: totalSales,
      Utilidad: totalProfit,
      "Margen %": Number(margin.toFixed(2)),
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "UTILIDAD");

    XLSX.writeFile(
      workbook,
      `UTILIDAD_${report.title || "ANALISIS"}.xlsx`
    );
  };

  const deleteReport = async () => {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este análisis de utilidad?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("profit_reports")
      .delete()
      .eq("id", report.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Análisis eliminado");
    router.push("/profit/history");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Editar análisis de utilidad
            </h1>

            <p className="mt-2 text-slate-600">
              {report.title || "ANÁLISIS"} — {report.start_date || "-"} a{" "}
              {report.end_date || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/profit/history"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver
            </Link>

            <button
              onClick={saveChanges}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              onClick={exportExcel}
              className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Exportar Excel
            </button>

            <button
              onClick={deleteReport}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Ventas</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              ${totalSales.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Compras</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              ${totalPurchases.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Utilidad</p>
            <h2
              className={`mt-3 text-3xl font-bold ${
                totalProfit >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              ${totalProfit.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">Margen</p>
            <h2 className="mt-3 text-3xl font-bold">
              {margin.toFixed(2)}%
            </h2>
          </div>
        </section>

        <section className="relative rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-2xl font-semibold">Agregar producto</h2>

          <input
            className="mt-5 w-full rounded-xl border border-slate-300 bg-white p-5 text-lg font-medium outline-none focus:border-black"
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {filteredProducts.length > 0 && (
            <div className="absolute left-6 right-6 z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-100"
                >
                  <p className="font-bold text-slate-900">{product.sku}</p>
                  <p className="text-sm text-slate-700">
                    Inventario: {product.description}
                  </p>
                  {product.invoice_description && (
                    <p className="text-sm text-slate-500">
                      Factura: {product.invoice_description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-2xl font-semibold">
            Productos del análisis
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Producto inventario</th>
                  <th className="p-4 text-left">Producto factura</th>
                  <th className="p-4 text-center">Compras</th>
                  <th className="p-4 text-center">Ventas</th>
                  <th className="p-4 text-center">Utilidad</th>
                  <th className="p-4 text-center">Margen</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const itemProfit =
                    Number(item.sale_amount || 0) -
                    Number(item.purchase_amount || 0);

                  const itemMargin =
                    Number(item.sale_amount || 0) > 0
                      ? (itemProfit / Number(item.sale_amount || 0)) * 100
                      : 0;

                  return (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-semibold">{item.sku}</td>
                      <td className="p-4">{item.description}</td>
                      <td className="p-4">
                        {item.invoice_description || "-"}
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-32 rounded-lg border border-slate-300 p-2 text-center font-bold"
                          value={item.purchase_amount}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "purchase_amount",
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-32 rounded-lg border border-slate-300 p-2 text-center font-bold"
                          value={item.sale_amount}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "sale_amount",
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>

                      <td
                        className={`p-4 text-center font-bold ${
                          itemProfit >= 0
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        ${itemProfit.toFixed(2)}
                      </td>

                      <td className="p-4 text-center font-bold">
                        {itemMargin.toFixed(2)}%
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No hay productos en este análisis
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