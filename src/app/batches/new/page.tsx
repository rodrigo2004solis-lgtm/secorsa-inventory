"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description?: string | null;
  keywords?: string | null;
  stock?: number | null;
};

type BatchItem = {
  product_id: string;
  sku: string;
  description: string;
  invoice_description?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  current_stock: number;
};

export default function NewBatchPage() {
  const [type, setType] = useState<"purchase" | "sale">("sale");
  const [clientProvider, setClientProvider] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const searchProducts = async (value: string) => {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(
        `sku.ilike.%${value}%,description.ilike.%${value}%,invoice_description.ilike.%${value}%,keywords.ilike.%${value}%`
      )
      .limit(10);

    if (error) {
      toast.error(error.message);
      setSearching(false);
      return;
    }

    setResults(data || []);
    setSearching(false);
  };

  const addProduct = (product: Product) => {
    const exists = items.find((item) => item.product_id === product.id);

    if (exists) {
      setItems(
        items.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: Number(item.quantity) + 1,
                total: (Number(item.quantity) + 1) * Number(item.unit_price),
              }
            : item
        )
      );
    } else {
      setItems([
        {
          product_id: product.id,
          sku: product.sku,
          description: product.description,
          invoice_description: product.invoice_description,
          quantity: 1,
          unit_price: 0,
          total: 0,
          current_stock: Number(product.stock || 0),
        },
        ...items,
      ]);
    }

    setQuery("");
    setResults([]);
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;

    const updated = [...items];
    updated[index].quantity = quantity;
    updated[index].total = quantity * Number(updated[index].unit_price);
    setItems(updated);
  };

  const updateUnitPrice = (index: number, unitPrice: number) => {
    if (unitPrice < 0) return;

    const updated = [...items];
    updated[index].unit_price = unitPrice;
    updated[index].total = Number(updated[index].quantity) * unitPrice;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalUnits = items.reduce(
    (acc, item) => acc + Number(item.quantity),
    0
  );

  const totalAmount = items.reduce(
    (acc, item) => acc + Number(item.total),
    0
  );

  const saveBatch = async () => {
    if (!clientProvider.trim()) {
      toast.error("Captura cliente o proveedor");
      return;
    }

    if (items.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    const hasInvalidPrices = items.some((item) => Number(item.unit_price) <= 0);

    if (hasInvalidPrices) {
      toast.error("Captura precio unitario en todos los productos");
      return;
    }

    // if (type === "sale") {
    //   const insufficientStock = items.find(
    //     (item) => Number(item.quantity) > Number(item.current_stock)
    //   );

    //   if (insufficientStock) {
    //     toast.error(
    //       `Stock insuficiente para ${insufficientStock.sku}. Disponible: ${insufficientStock.current_stock}`
    //     );
    //     return;
    //   }
    // }

    const { data: batch, error } = await supabase
      .from("batches")
      .insert({
        type,
        client_provider: clientProvider.trim().toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const batchItems = items.map((item) => ({
      batch_id: batch.id,
      product_id: item.product_id,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from("batch_items")
      .insert(batchItems);

    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }

    for (const item of items) {
      const newStock =
        type === "purchase"
          ? Number(item.current_stock) + Number(item.quantity)
          : Number(item.current_stock) - Number(item.quantity);

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: newStock,
        })
        .eq("id", item.product_id);

      if (stockError) {
        toast.error(stockError.message);
        return;
      }
    }

    toast.success("Lote guardado y stock actualizado");

    setClientProvider("");
    setItems([]);
    setType("sale");
    setQuery("");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Crear lote</h1>

          <p className="mt-2 text-slate-600">
            Captura compras o ventas con inventario automático.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-2xl font-semibold text-slate-800">
            Datos del lote
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Tipo de movimiento
              </label>

              <select
                className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "purchase" | "sale")
                }
              >
                <option value="sale">Venta</option>
                <option value="purchase">Compra</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Cliente / Proveedor
              </label>

              <input
                className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                placeholder="Ej. CLIENTE GENERAL / PROVEEDOR"
                value={clientProvider}
                onChange={(e) => setClientProvider(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Buscador dinámico
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Busca por SKU, producto inventario, producto factura o palabras
                clave.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {query.length >= 2 ? `${results.length} resultado(s)` : "Listo"}
            </span>
          </div>

          <input
            className="w-full rounded-xl border border-slate-300 bg-white p-5 text-lg font-medium text-slate-900 outline-none focus:border-black focus:ring-2 focus:ring-slate-200"
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => searchProducts(e.target.value)}
            autoFocus
          />

          {searching && (
            <div className="mt-3 text-sm font-semibold text-slate-500">
              Buscando productos...
            </div>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              No se encontraron productos con esa búsqueda.
            </div>
          )}

          {results.length > 0 && (
            <div className="absolute left-6 right-6 z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
              {results.map((product) => (
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

                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        Stock actual: {Number(product.stock || 0)}
                      </p>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Resumen final del lote
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                El producto más reciente aparece arriba.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Productos: {items.length}
              </span>

              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                Unidades: {totalUnits}
              </span>

              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                Total: ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1150px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Producto inventario</th>
                  <th className="p-4 text-left">Producto factura</th>
                  <th className="p-4 text-center">Stock actual</th>
                  <th className="p-4 text-center">Cantidad</th>
                  <th className="p-4 text-center">Precio unitario</th>
                  <th className="p-4 text-center">Total</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const projectedStock =
                    type === "purchase"
                      ? Number(item.current_stock) + Number(item.quantity)
                      : Number(item.current_stock) - Number(item.quantity);

                  return (
                    <tr
                      key={item.product_id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-900">
                        {item.sku}
                      </td>

                      <td className="p-4 text-slate-700">
                        {item.description}
                      </td>

                      <td className="p-4 text-slate-500">
                        {item.invoice_description || "-"}
                      </td>

                      <td className="p-4 text-center font-bold">
                        {item.current_stock}
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0.01"
                          step="1"
                          className="w-28 rounded-lg border border-slate-300 p-2 text-center font-bold"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(index, Number(e.target.value))
                          }
                        />
                      </td>

                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-32 rounded-lg border border-slate-300 p-2 text-center font-bold"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateUnitPrice(index, Number(e.target.value))
                          }
                        />
                      </td>

                      <td className="p-4 text-center font-bold text-green-700">
                        ${Number(item.total).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                        >
                          Quitar
                        </button>

                        <p
                          className={`mt-2 text-xs font-bold ${
                            projectedStock < 0
                              ? "text-red-600"
                              : "text-slate-500"
                          }`}
                        >
                          Final: {projectedStock}
                        </p>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No hay productos agregados al lote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={saveBatch}
            className="mt-6 w-full rounded-xl bg-black px-8 py-4 text-lg font-semibold text-white hover:bg-slate-800 md:w-auto"
          >
            Guardar lote y actualizar stock
          </button>
        </section>
      </div>
    </main>
  );
}