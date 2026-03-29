import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Bienvenido a SIPS</h2>
        <p className="mt-1 text-slate-500">Selecciona un modulo desde el menu lateral.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/dashboard/solicitudes" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Solicitudes</h3>
          <p className="mt-1 text-sm text-slate-500">Gestiona solicitudes por mes, asigna un mismo dia a varias personas y elimina solicitudes pendientes.</p>
        </Link>
        <Link href="/dashboard/composicion" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Composicion</h3>
          <p className="mt-1 text-sm text-slate-500">Administra unicamente nombres de composicion (crear, editar, eliminar y listar).</p>
        </Link>
        <Link href="/dashboard/asignacion" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Reporte composicion sindicalizados</h3>
          <p className="mt-1 text-sm text-slate-500">Genera reportes en Excel y PDF por cada composicion de sindicalizados.</p>
        </Link>
        <Link href="/dashboard/consulta-documento" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Consulta SOAP</h3>
          <p className="mt-1 text-sm text-slate-500">Consulta datos por documento usando el web service SOAP del SENA.</p>
        </Link>
        <Link href="/dashboard/sindicatos" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Sindicatos</h3>
          <p className="mt-1 text-sm text-slate-500">Administra el modulo de sindicatos con CRUD en popups usando nombre y estado.</p>
        </Link>
        <Link href="/dashboard/email" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="font-semibold text-slate-700">Correo</h3>
          <p className="mt-1 text-sm text-slate-500">Envia correos HTML a traves de la API.</p>
        </Link>
      </div>
    </div>
  );
}
