"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  keywords: string | null;
};

type ProfitItem = {
  product_id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  purchase_amount: number;
  sale_amount: number;
};

const DRAFT_KEY = "secorsa-profit-draft";

export default function ProfitPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [title, setTitle] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [items, setItems] = useState<ProfitItem[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);

    if (!draft) return;

    const confirmRestore = window.confirm(
      "Hay un análisis de utilidad preguardado. ¿Deseas recuperarlo?"
    );

    if (!confirmRestore) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    try {
      const parsed = JSON.parse(draft);

      if (parsed.startDate) setStartDate(parsed.startDate);
      if (parsed.endDate) setEndDate(parsed.endDate);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.items) setItems(parsed.items);

      toast.success("Análisis recuperado");
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!startDate && !endDate && !title.trim() && items.length === 0) return;

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        startDate,
        endDate,
        title,
        items,
      })
    );

    setDraftSaved(true);

    const timer = setTimeout(() => {
      setDraftSaved(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [startDate, endDate, title, items]);

  const searchProducts = async (value: string) => {
    const cleanValue = value.trim().toUpperCase();

    setQuery(value.toUpperCase());

    if (cleanValue.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, sku, description, invoice_description, keywords")
      .or(
        `sku.ilike.%${cleanValue}%,description.ilike.%${cleanValue}%,invoice_description.ilike.%${cleanValue}%,keywords.ilike.%${cleanValue}%`
      )
      .limit(20);

    setSearching(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSearchResults(data || []);
  };

  const refreshSearch = () => {
    setQuery("");
    setSearchResults([]);
    toast.success("Buscador actualizado");
  };

  const addProduct = (product: Product) => {
    const exists = items.find((item) => item.product_id === product.id);

    if (exists) {
      toast.error("Este producto ya está agregado");
      setQuery("");
      setSearchResults([]);
      return;
    }

    setItems([
      {
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
    setSearchResults([]);
    toast.success("Producto agregado");
  };

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

  const removeItem = (index: number) => {
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

  const buildRows = () => {
    const rows = items.map((item) => {
      const profit =
        Number(item.sale_amount || 0) - Number(item.purchase_amount || 0);

      const itemMargin =
        Number(item.sale_amount || 0) > 0
          ? (profit / Number(item.sale_amount || 0)) * 100
          : 0;

      return {
        "Fecha inicial": startDate,
        "Fecha final": endDate,
        Título: title,
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
      Título: "",
      SKU: "",
      "Producto inventario": "TOTALES",
      "Producto factura": "",
      Compras: totalPurchases,
      Ventas: totalSales,
      Utilidad: totalProfit,
      "Margen %": Number(margin.toFixed(2)),
    });

    return rows;
  };

  const exportExcel = () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(buildRows());
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "UTILIDAD");

    XLSX.writeFile(
      workbook,
      `UTILIDAD_CATALOGO_${startDate || "INICIO"}_${endDate || "FIN"}.xlsx`
    );

    toast.success("Reporte exportado correctamente");
  };

  const saveAnalysis = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    setSaving(true);

    const { data: report, error: reportError } = await supabase
      .from("profit_reports")
      .insert({
        start_date: startDate || null,
        end_date: endDate || null,
        title: title.trim().toUpperCase() || "ANÁLISIS DE UTILIDAD",
        total_purchases: totalPurchases,
        total_sales: totalSales,
        total_profit: totalProfit,
        margin: Number(margin.toFixed(2)),
      })
      .select()
      .single();

    if (reportError) {
      toast.error(reportError.message);
      setSaving(false);
      return;
    }

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

    setSaving(false);

    toast.success("Análisis guardado correctamente");

    localStorage.removeItem(DRAFT_KEY);
  };

  const exportAndSave = async () => {
    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    exportExcel();
    await saveAnalysis();
  };

  const clearDraft = () => {
    const confirmClear = window.confirm(
      "¿Seguro que deseas limpiar este análisis y borrar el borrador?"
    );

    if (!confirmClear) return;

    localStorage.removeItem(DRAFT_KEY);

    setStartDate("");
    setEndDate("");
    setTitle("");
    setItems([]);
    setQuery("");
    setSearchResults([]);

    toast.success("Análisis limpiado");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Utilidad por catálogo</h1>

            <p className="mt-2 text-slate-600">
              Calcula, exporta y guarda utilidad por producto usando el catálogo
              homologado.
            </p>
          </div>

          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow">
            {draftSaved
              ? "🟢 Borrador guardado"
              : "Borrador automático activo"}
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-2xl font-semibold">Periodo</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Título del análisis
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 p-4"
                placeholder="Ej. UTILIDAD ENERO"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Fecha inicial
              </label>

              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 p-4"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Fecha final
              </label>

              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 p-4"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="relative rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Agregar producto del catálogo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Busca por SKU, producto inventario, producto factura o palabras
                clave.
              </p>
            </div>

            <button
              onClick={refreshSearch}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Actualizar buscador
            </button>
          </div>

          <input
            className="mt-5 w-full rounded-xl border border-slate-300 bg-white p-5 text-lg font-medium uppercase outline-none focus:border-black"
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => searchProducts(e.target.value)}
          />

          {searching && (
            <div className="mt-3 text-sm font-semibold text-slate-500">
              Buscando productos...
            </div>
          )}

          {query.trim().length >= 2 &&
            !searching &&
            searchResults.length === 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                No se encontraron productos. Si acabas de registrarlo en
                catálogo, vuelve a escribir el código o presiona “Actualizar
                buscador”.
              </div>
            )}

          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">{product.sku}</p>

                      <p className="text-sm text-slate-700">
                        Inventario: {product.description}
                      </p>

                      {product.invoice_description && (
                        <p className="text-sm text-slate-500">
                          Factura: {product.invoice_description}
                        </p>
                      )}

                      {product.keywords && (
                        <p className="mt-1 text-xs text-slate-400">
                          Keywords: {product.keywords}
                        </p>
                      )}
                    </div>

                    <span className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                      Agregar
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

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

            <h2
              className={`mt-3 text-3xl font-bold ${
                margin >= 0 ? "text-slate-900" : "text-red-600"
              }`}
            >
              {margin.toFixed(2)}%
            </h2>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Detalle por producto</h2>

              <p className="mt-1 text-sm text-slate-500">
                Captura manualmente compras y ventas por producto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportExcel}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Solo exportar Excel
              </button>

              <button
                onClick={saveAnalysis}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar análisis"}
              </button>

              <button
                onClick={exportAndSave}
                disabled={saving}
                className="rounded-xl bg-black px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Exportar y guardar
              </button>

              <button
                onClick={clearDraft}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1200px]">
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
                    <tr
                      key={item.product_id}
                      className="border-b hover:bg-slate-50"
                    >
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
                      Agrega productos para calcular utilidad.
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