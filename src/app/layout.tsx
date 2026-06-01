import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "SECORSA Inventory",
  description: "Sistema de compras y ventas por lote",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#0f172a",
              color: "#fff",
              borderRadius: "12px",
              padding: "16px",
            },
          }}
        />

        <Sidebar />

        <main className="ml-72 min-h-screen bg-slate-100">
          {children}
        </main>
      </body>
    </html>
  );
}