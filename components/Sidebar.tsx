"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/services/session";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: "⊞" },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: "◫" },
  { href: "/dashboard/composicion", label: "Composicion", icon: "▦" },
  { href: "/dashboard/asignacion", label: "Reporte composicion sindicalizados", icon: "⇌" },
  { href: "/dashboard/consulta-documento", label: "Consulta SOAP", icon: "◎" },
  { href: "/dashboard/sindicatos", label: "Sindicatos", icon: "☰" },
  { href: "/dashboard/sindicalizados", label: "Sindicalizados", icon: "👥" },
  { href: "/dashboard/email", label: "Correo", icon: "✉" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    window.dispatchEvent(new Event("sips-auth-updated"));
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h1 className="text-lg font-bold text-slate-800">SIPS</h1>
        <p className="text-xs text-slate-500">Panel de administracion</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
