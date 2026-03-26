export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Bienvenido a SIPS</h2>
        <p className="mt-1 text-slate-500">Selecciona un modulo desde el menu lateral.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700">Tareas</h3>
          <p className="mt-1 text-sm text-slate-500">Gestiona el listado de tareas del sistema.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700">Correo</h3>
          <p className="mt-1 text-sm text-slate-500">Envia correos HTML a traves de la API.</p>
        </div>
      </div>
    </div>
  );
}
