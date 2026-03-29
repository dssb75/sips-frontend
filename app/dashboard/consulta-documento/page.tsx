"use client";

import { FormEvent, useState } from "react";
import { ConsDocum, consultaDocumento } from "@/services/calendar";

export default function ConsultaDocumentoPage() {
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ConsDocum[]>([]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await consultaDocumento({ documento });
      setItems(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo consultar el servicio SOAP.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Integraciones externas</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Consulta SOAP por documento</h1>
        <p className="mt-2 text-sm text-slate-500">
          Consulta el servicio SOAP del SENA y visualiza la informacion retornada por numero de documento.          
        </p>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700 md:col-span-3">
            Documento
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Ej: 123456789"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
              required
            />
          </label>

        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Consultando..." : "Consultar SOAP"}
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Resultado</h2>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Sin resultados para mostrar.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item, index) => (
              <article key={`${item.documento}-${index}`} className="rounded-xl border border-slate-200 p-4">
                {item.control_r ? (
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {item.control_r}
                  </p>
                ) : null}
                <h3 className="text-sm font-semibold text-slate-800">
                  {item.nombre} {item.apellido}
                </h3>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div><dt className="font-semibold text-slate-700">Tipo doc</dt><dd>{item.tip_docu || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Documento</dt><dd>{item.documento || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Sexo</dt><dd>{item.sexo || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Email</dt><dd>{item.email || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Estado civil</dt><dd>{item.estado_civil || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Celular</dt><dd>{item.celular || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Telefono</dt><dd>{item.telefono || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Direccion</dt><dd>{item.direccion || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Fecha nac</dt><dd>{item.fecha_nac || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Estado</dt><dd>{item.estado || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Regional</dt><dd>{item.regional || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Centro</dt><dd>{item.nom_centro || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Cargo actual</dt><dd>{item.carg_act || "-"}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Inicio</dt><dd>{item.fec_inicio || "-"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
