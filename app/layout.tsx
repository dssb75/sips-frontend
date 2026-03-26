import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRUD",
  description: "Crud Minimalista con Next.js 13 y Tailwind CSS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  );
}