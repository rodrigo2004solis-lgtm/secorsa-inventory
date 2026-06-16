import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-slate-950 text-white shadow-xl">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-2xl font-bold">SECORSA</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inventory SaaS
        </p>
      </div>

      <nav className="space-y-2 p-4">
        <Link
          href="/dashboard"
          className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
        >
          Dashboard
        </Link>

        <Link
          href="/catalog"
          className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
        >
          Catálogo
        </Link>

        <Link
          href="/batches/new"
          className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
        >
          Nuevo lote
        </Link>

        <Link
          href="/batches"
          className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
        >
          Historial
        </Link>
          <Link
          href="/inventory"
          className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
        >
          Inventario
        </Link>

        <Link
            href="/reports/catalog-map"
            className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
          >
            Reporte catálogo
          </Link>
          <Link
            href="/profit"
            className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
          >
            Utilidad
          </Link>
          <Link
            href="/profit/dashboard"
            className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
          >
            Dashboard Utilidad
          </Link>
          <Link
            href="/profit/history"
            className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
          >
            Historial Utilidad
          </Link>
          <Link
            href="/profit/report"
            className="block rounded-xl px-4 py-3 font-medium text-slate-200 hover:bg-slate-800"
          >
            Reporte PDF
          </Link>
      </nav>
    </aside>
  );
}