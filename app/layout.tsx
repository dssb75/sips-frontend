import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPS",
  description: "SIPS con Next.js 13 y Tailwind CSS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="es" className="scroll-smooth">
      <body className="min-h-screen bg-gray-50 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sistema</p>
                <h1 className="text-lg font-bold text-slate-800">SIPS</h1>
              </div>
              <p className="text-xs text-slate-500">Gestion sindical integrada</p>
            </div>
          </header>

          <div className="flex-1 min-h-0">{children}</div>

          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 text-xs text-slate-500 sm:px-6">
              <span>SIPS</span>
              <span>© {currentYear} Todos los derechos reservados</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}