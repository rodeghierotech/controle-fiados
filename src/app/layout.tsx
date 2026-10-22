import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Fiados — Bom Pra Cachorro",
  description: "Controle online de contas fiadas",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-primary/30 bg-black/95 backdrop-blur">
          <div className="container flex h-20 items-center justify-between">
            <Link href="/" aria-label="Início — Bom Pra Cachorro">
              <img
                src="/logo-bpc.jpeg"
                alt="Bom Pra Cachorro Pet Shop"
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-contain"
              />
            </Link>
            <Link
              href="/configuracoes"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-background/80 transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <Settings className="h-4 w-4" aria-hidden />
              Configurações
            </Link>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
