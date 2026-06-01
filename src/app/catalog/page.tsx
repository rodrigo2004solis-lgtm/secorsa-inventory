"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

type Product = {
  id: string;
  sku: string;
  description: string;
  invoice_description: string | null;
  keywords: string | null;
  stock: number | null;
};

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  const [search, setSearch] = useState("");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInvoiceDescription, setEditInvoiceDescription] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProducts(data || []);
  };

  const addProduct = async () => {
    if (!sku.trim() || !description.trim()) {
      toast.error("Captura SKU y producto de inventario");
      return;
    }

    const { error } = await supabase.from("products").upsert(
      {
        sku: sku.trim().toUpperCase(),
        description: description.trim().toUpperCase(),
        invoice_description: invoiceDescription.trim().toUpperCase() || null,
        keywords: keywords.trim().toUpperCase() || null,
      },
      { onConflict: "sku" }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Producto guardado");

    setSku("");
    setDescription("");
    setInvoiceDescription("");
    setKeywords("");

    loadProducts();
  };

  const getValue = (row: Record<string, unknown>, options: string[]) => {
    const keys = Object.keys(row);

    const foundKey = keys.find((key) => {
      const cleanKey = key
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return options.some((option) =>
        cleanKey.includes(
          option
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        )
      );
    });

    return foundKey ? String(row[foundKey] || "").trim() : "";
  };

  const importExcel = async (file: File) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows: Record<string, unknown>[] =
        XLSX.utils.sheet_to_json(worksheet);

      const productsToInsert = rows
        .map((row) => {
          const rowSku = getValue(row, ["sku"]);
          const rowInventoryProduct = getValue(row, [
            "producto inventario",
            "inventario",
            "description",
            "descripcion",
            "descripcion inventario",
            "producto",
          ]);
          const rowInvoiceProduct = getValue(row, [
            "producto factura",
            "factura",
            "invoice",
            "invoice description",
            "descripcion factura",
          ]);
          const rowKeywords = getValue(row, [
            "palabras clave",
            "keywords",
            "alias",
            "busqueda",
            "búsqueda",
          ]);

          return {
            sku: rowSku.trim().toUpperCase(),
            description: rowInventoryProduct.trim().toUpperCase(),
            invoice_description:
              rowInvoiceProduct.trim().toUpperCase() || null,
            keywords: rowKeywords.trim().toUpperCase() || null,
          };
        })
        .filter((product) => product.sku && product.description);

      if (productsToInsert.length === 0) {
        toast.error("No se encontraron productos válidos en el Excel");
        return;
      }

      const uniqueProducts = Array.from(
        new Map(
          productsToInsert.map((product) => [product.sku, product])
        ).values()
      );

      const { error } = await supabase.from("products").upsert(uniqueProducts, {
        onConflict: "sku",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`${uniqueProducts.length} productos importados`);
      loadProducts();
    };

    reader.readAsArrayBuffer(file);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditSku(product.sku);
    setEditDescription(product.description);
    setEditInvoiceDescription(product.invoice_description || "");
    setEditKeywords(product.keywords || "");
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditSku("");
    setEditDescription("");
    setEditInvoiceDescription("");
    setEditKeywords("");
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    if (!editSku.trim() || !editDescription.trim()) {
      toast.error("Captura SKU y producto de inventario");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({
        sku: editSku.trim().toUpperCase(),
        description: editDescription.trim().toUpperCase(),
        invoice_description:
          editInvoiceDescription.trim().toUpperCase() || null,
        keywords: editKeywords.trim().toUpperCase() || null,
      })
      .eq("id", editingProduct.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Producto actualizado");
    closeEditModal();
    loadProducts();
  };

  const deleteProduct = async (product: Product) => {
    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar el producto ${product.sku}?`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Producto eliminado");
    loadProducts();
  };

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

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Catálogo de productos
          </h1>

          <p className="mt-2 text-slate-600">
            Administra SKU, producto de inventario, producto de factura y
            palabras clave.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="mb-5 text-2xl font-semibold text-slate-800">
            Agregar producto
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
              placeholder="SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <input
              className="rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
              placeholder="Producto según inventario"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              className="rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
              placeholder="Producto según factura"
              value={invoiceDescription}
              onChange={(e) => setInvoiceDescription(e.target.value)}
            />

            <input
              className="rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
              placeholder="Palabras clave"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <button
            onClick={addProduct}
            className="mt-5 rounded-xl bg-black px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Guardar producto
          </button>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-800">
              Importar catálogo desde Excel
            </h3>

            <p className="mb-4 text-sm text-slate-500">
              Columnas recomendadas: SKU, PRODUCTO INVENTARIO, PRODUCTO
              FACTURA, PALABRAS CLAVE.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full rounded-xl border border-slate-300 bg-white p-4"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importExcel(file);
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Productos registrados
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Mostrando {filteredProducts.length} de {products.length}{" "}
                productos
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
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Producto inventario</th>
                  <th className="p-4 text-left">Producto factura</th>
                  <th className="p-4 text-left">Palabras clave</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
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

                    <td className="p-4 text-center font-bold">
                      {Number(product.stock || 0)}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => deleteProduct(product)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-slate-500" colSpan={6}>
                      No hay productos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-slate-900">
                Editar producto
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Modifica la información operativa y fiscal del producto.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    SKU
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Producto inventario
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Producto factura
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                    value={editInvoiceDescription}
                    onChange={(e) => setEditInvoiceDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Palabras clave
                  </label>

                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-black"
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <button
                  onClick={updateProduct}
                  className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}