"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description?: string | null;
};

type CountItem = {
  code: string;
  description: string;
  quantity: number;
  existsInCatalog: boolean;
};

const DRAFT_KEY = "secorsa-manual-inventory-count";

export default function InventoryCountPage() {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [existsInCatalog, setExistsInCatalog] = useState(false);
  const [items, setItems] = useState<CountItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);

    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  }, [items]);

  const cleanCode = (value: string) => {
    return value.trim().toUpperCase();
  };

  const searchProduct = async () => {
    const finalCode = cleanCode(code);

    if (!finalCode) {
      toast.error("Captura un código");
      return;
    }

    setSearching(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, sku, description, invoice_description")
      .ilike("sku", finalCode)
      .maybeSingle();

    setSearching(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      const product = data as Product;

      setCode(product.sku);
      setDescription(product.description);
      setExistsInCatalog(true);

      toast.success("Código encontrado");
      return;
    }

    setCode(finalCode);
    setDescription("");
    setExistsInCatalog(false);
    toast("Código no encontrado. Captura descripción manual.");
  };

  const addItem = async () => {
    const finalCode = cleanCode(code);

    if (!finalCode) {
      toast.error("Captura el código");
      return;
    }

    if (!description.trim()) {
      toast.error("Captura la descripción");
      return;
    }

    if (Number(quantity) <= 0) {
      toast.error("Captura una cantidad válida");
      return;
    }

    const existingIndex = items.findIndex(
      (item) => cleanCode(item.code) === finalCode
    );

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity =
        Number(updated[existingIndex].quantity) + Number(quantity);

      if (!updated[existingIndex].description && description.trim()) {
        updated[existingIndex].description = description.trim().toUpperCase();
      }

      setItems(updated);
      toast.success("Cantidad sumada al código existente");
    } else {
      setItems([
        {
          code: finalCode,
          description: description.trim().toUpperCase(),
          quantity: Number(quantity),
          existsInCatalog,
        },
        ...items,
      ]);

      toast.success("Producto agregado al conteo");
    }

    setCode("");
    setDescription("");
    setQuantity(1);
    setExistsInCatalog(false);

    setTimeout(() => {
      const input = document.getElementById("code-input");
      input?.focus();
    }, 100);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, value: number) => {
    if (value < 0) return;

    const updated = [...items];
    updated[index].quantity = value;
    setItems(updated);
  };

  const updateDescription = (index: number, value: string) => {
    const updated = [...items];
    updated[index].description = value.toUpperCase();
    setItems(updated);
  };

  const clearCount = () => {
    const confirmClear = window.confirm(
      "¿Seguro que deseas limpiar todo el conteo?"
    );

    if (!confirmClear) return;

    setItems([]);
    localStorage.removeItem(DRAFT_KEY);
    toast.success("Conteo limpiado");
  };

  const exportExcel = () => {
    if (items.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const rows = items.map((item, index) => ({
      "#": index + 1,
      CODIGO: item.code,
      DESCRIPCION: item.description,
      CANTIDAD: item.quantity,
      "EXISTE EN CATALOGO": item.existsInCatalog ? "SI" : "NO",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "CONTEO_MANUAL");

    XLSX.writeFile(workbook, "CONTEO_INVENTARIO_MANUAL.xlsx");
  };

  const totalUnits = items.reduce(
    (acc, item) => acc + Number(item.quantity || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">
            Conteo manual express
          </h1>

          <p className="mt-2 text-slate-600">
            Captura código, descripción y cantidad desde teléfono.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Código
              </label>

              <input
                id="code-input"
                className="w-full rounded-xl border border-slate-300 bg-white p-5 text-2xl font-bold uppercase outline-none focus:border-black"
                placeholder="ESCANEA O ESCRIBE CÓDIGO"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setExistsInCatalog(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchProduct();
                  }
                }}
                autoFocus
              />

              <button
                onClick={searchProduct}
                disabled={searching}
                className="mt-3 w-full rounded-xl bg-slate-900 p-4 text-lg font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {searching ? "Buscando..." : "Buscar código"}
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Descripción
              </label>

              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-300 bg-white p-4 text-lg font-semibold uppercase outline-none focus:border-black"
                placeholder="DESCRIPCIÓN DEL PRODUCTO"
                value={description}
                onChange={(e) => setDescription(e.target.value.toUpperCase())}
              />

              {existsInCatalog ? (
                <p className="mt-2 rounded-lg bg-green-100 p-2 text-center text-sm font-bold text-green-700">
                  Código encontrado en catálogo
                </p>
              ) : (
                <p className="mt-2 rounded-lg bg-amber-100 p-2 text-center text-sm font-bold text-amber-700">
                  Código manual / no dado de alta
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Cantidad
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 bg-white p-5 text-center text-3xl font-bold outline-none focus:border-black"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addItem();
                  }
                }}
              />
            </div>

            <button
              onClick={addItem}
              className="w-full rounded-xl bg-black p-5 text-xl font-bold text-white hover:bg-slate-800"
            >
              Agregar al conteo
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 text-center shadow">
            <p className="text-sm text-slate-500">Códigos</p>
            <h2 className="text-3xl font-bold">{items.length}</h2>
          </div>

          <div className="rounded-2xl bg-white p-4 text-center shadow">
            <p className="text-sm text-slate-500">Unidades</p>
            <h2 className="text-3xl font-bold">{totalUnits}</h2>
          </div>
        </section>

        <section className="flex gap-3">
          <button
            onClick={exportExcel}
            className="w-full rounded-xl bg-green-700 p-4 font-bold text-white hover:bg-green-800"
          >
            Exportar Excel
          </button>

          <button
            onClick={clearCount}
            className="w-full rounded-xl bg-red-600 p-4 font-bold text-white hover:bg-red-700"
          >
            Limpiar
          </button>
        </section>

        <section className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.code}-${index}`}
              className="rounded-2xl bg-white p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black text-slate-900">
                    {item.code}
                  </p>

                  <p
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      item.existsInCatalog
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.existsInCatalog ? "CATÁLOGO" : "MANUAL"}
                  </p>
                </div>

                <button
                  onClick={() => removeItem(index)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  Descripción
                </label>

                <textarea
                  className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm font-semibold uppercase"
                  value={item.description}
                  onChange={(e) => updateDescription(index, e.target.value)}
                />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  Cantidad
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 p-4 text-center text-2xl font-bold"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(index, Number(e.target.value))}
                />
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
              No hay productos capturados todavía.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}