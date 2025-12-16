import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Inventario ML",
  description: "Inventario con sincronizacion Mercado Libre",
  keywords: ["inventario", "mercado libre", "stock", "precio"],
  applicationName: "Inventario ML"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
