"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Composicion,
  Sindicalizado,
  listComposiciones,
  listSindicalizados,
} from "@/services/calendar";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ReportRow = {
  nombre: string;
  documento: string;
  composicion?: string;
  regional: string;
  cargo_actual: string;
  centro: string;
  email: string;
  telefono: string;
  celular: string;
  sindicatos: string;
  estado: string;
};

export default function AsignacionPage() {
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  const [sindicalizados, setSindicalizados] = useState<Sindicalizado[]>([]);
  const [selectedComposicionId, setSelectedComposicionId] = useState<number | null>(null);
  const [searchMiembros, setSearchMiembros] = useState("");
  const [pageMiembros, setPageMiembros] = useState(1);
  const [pageSizeMiembros, setPageSizeMiembros] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [comp, sind] = await Promise.all([listComposiciones(), listSindicalizados()]);
      setComposiciones(comp);
      setSindicalizados(sind);
      if (comp.length > 0) {
        setSelectedComposicionId(comp[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const miembrosPorComposicion = useMemo(() => {
    const map = new Map<number, Sindicalizado[]>();
    for (const persona of sindicalizados) {
      const composicionId = persona.composicion_id;
      if (!composicionId) continue;
      const current = map.get(composicionId) ?? [];
      current.push(persona);
      map.set(composicionId, current);
    }
    return map;
  }, [sindicalizados]);

  const miembros = useMemo(
    () => miembrosPorComposicion.get(selectedComposicionId ?? -1) ?? [],
    [miembrosPorComposicion, selectedComposicionId],
  );

  const filteredMiembros = useMemo(() => {
    const q = searchMiembros.trim().toLowerCase();
    return q
      ? miembros.filter((s) => {
          const sindicatos = (s.sindicatos ?? []).join(" ").toLowerCase();
          return s.nombre.toLowerCase().includes(q) || s.documento.toLowerCase().includes(q) || sindicatos.includes(q);
        })
      : miembros;
  }, [miembros, searchMiembros]);

  const composicionNombre = useMemo(
    () => composiciones.find((c) => c.id === selectedComposicionId)?.nombre ?? "",
    [composiciones, selectedComposicionId],
  );

  const totalPagesMiembros = Math.max(1, Math.ceil(filteredMiembros.length / pageSizeMiembros));
  const safePageMiembros = Math.min(pageMiembros, totalPagesMiembros);
  const pagedMiembros = useMemo(() => {
    const start = (safePageMiembros - 1) * pageSizeMiembros;
    return filteredMiembros.slice(start, start + pageSizeMiembros);
  }, [filteredMiembros, safePageMiembros, pageSizeMiembros]);

  useEffect(() => { setPageMiembros(1); }, [searchMiembros, pageSizeMiembros]);

  const formatSindicatos = (item: Sindicalizado) => {
    if (!item.sindicatos || item.sindicatos.length === 0) {
      return "Sin sindicato";
    }
    return item.sindicatos.join(", ");
  };

  const handleSelectComposicion = (id: number) => {
    setSelectedComposicionId(id);
    setSearchMiembros("");
    setPageMiembros(1);
    setError(null);
    setInfo(null);
  };

  const buildReportRows = (composicionId: number): ReportRow[] => {
    const rows = miembrosPorComposicion.get(composicionId) ?? [];
    return rows.map((item) => ({
      nombre: item.nombre,
      documento: item.documento,
      regional: item.regional || "N/A",
      cargo_actual: item.cargo_actual || "N/A",
      centro: item.centro || "N/A",
      email: item.email || "N/A",
      telefono: item.telefono || "N/A",
      celular: item.celular || "N/A",
      sindicatos: formatSindicatos(item),
      estado: item.estado || "Activo",
    }));
  };

  const buildGeneralReportRows = (): ReportRow[] => {
    const composicionNameById = new Map<number, string>();
    for (const composicion of composiciones) {
      composicionNameById.set(composicion.id, composicion.nombre);
    }

    return sindicalizados.map((item) => ({
      nombre: item.nombre,
      documento: item.documento,
      composicion: composicionNameById.get(item.composicion_id) || "Sin composicion",
      regional: item.regional || "N/A",
      cargo_actual: item.cargo_actual || "N/A",
      centro: item.centro || "N/A",
      email: item.email || "N/A",
      telefono: item.telefono || "N/A",
      celular: item.celular || "N/A",
      sindicatos: formatSindicatos(item),
      estado: item.estado || "Activo",
    }));
  };

  const exportarExcel = (composicionId: number, composicionName: string) => {
    const rows = buildReportRows(composicionId);
    if (rows.length === 0) {
      setInfo(`La composicion "${composicionName}" no tiene sindicalizados para exportar.`);
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    const filename = `reporte_${composicionName.replaceAll(/\s+/g, "_").toLowerCase()}.xlsx`;
    XLSX.writeFile(workbook, filename);
    setInfo(`Reporte Excel generado para "${composicionName}".`);
  };

  const exportarPdf = (composicionId: number, composicionName: string) => {
    const rows = buildReportRows(composicionId);
    if (rows.length === 0) {
      setInfo(`La composicion "${composicionName}" no tiene sindicalizados para exportar.`);
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const now = new Date().toLocaleString();
    doc.setFontSize(14);
    doc.text("Reporte Composicion Sindicalizados", 14, 14);
    doc.setFontSize(10);
    doc.text(`Composicion: ${composicionName} | Generado: ${now}`, 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["#", "Nombre", "Documento", "Regional", "Cargo", "Centro", "Email", "Telefono", "Celular", "Sindicatos", "Estado"]],
      body: rows.map((item, index) => [
        String(index + 1),
        item.nombre,
        item.documento,
        item.regional,
        item.cargo_actual,
        item.centro,
        item.email,
        item.telefono,
        item.celular,
        item.sindicatos,
        item.estado,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    const filename = `reporte_${composicionName.replaceAll(/\s+/g, "_").toLowerCase()}.pdf`;
    doc.save(filename);
    setInfo(`Reporte PDF descargado para "${composicionName}".`);
  };

  const exportarSeleccionActual = (format: "excel" | "pdf") => {
    if (!selectedComposicionId || !composicionNombre) {
      setError("Selecciona una composicion para exportar su reporte.");
      return;
    }

    setError(null);
    if (format === "excel") {
      exportarExcel(selectedComposicionId, composicionNombre);
    } else {
      exportarPdf(selectedComposicionId, composicionNombre);
    }
  };

  const exportarReporteGeneralExcel = () => {
    const rows = buildGeneralReportRows();
    if (rows.length === 0) {
      setInfo("No hay sindicalizados para generar el reporte general.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte General");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `reporte_general_composicion_sindicalizados_${stamp}.xlsx`);
    setInfo("Reporte general en Excel generado correctamente.");
  };

  const exportarReporteGeneralPdf = () => {
    const rows = buildGeneralReportRows();
    if (rows.length === 0) {
      setInfo("No hay sindicalizados para generar el reporte general.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const now = new Date().toLocaleString();
    doc.setFontSize(14);
    doc.text("Reporte General Composicion Sindicalizados", 14, 14);
    doc.setFontSize(10);
    doc.text(`Incluye todos los sindicalizados | Generado: ${now}`, 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["#", "Nombre", "Documento", "Composicion", "Regional", "Cargo", "Centro", "Email", "Telefono", "Celular", "Sindicatos", "Estado"]],
      body: rows.map((item, index) => [
        String(index + 1),
        item.nombre,
        item.documento,
        item.composicion || "Sin composicion",
        item.regional,
        item.cargo_actual,
        item.centro,
        item.email,
        item.telefono,
        item.celular,
        item.sindicatos,
        item.estado,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`reporte_general_composicion_sindicalizados_${stamp}.pdf`);
    setInfo("Reporte general en PDF descargado correctamente.");
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reportes</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">Reporte Composicion Sindicalizados</h1>
            <p className="mt-2 text-sm text-slate-500">
              Exporta reportes en Excel o PDF para cada composicion de sindicalizados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportarReporteGeneralExcel}
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Reporte general Excel
            </button>
            <button
              type="button"
              onClick={exportarReporteGeneralPdf}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reporte general PDF
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Cargando datos...
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Composiciones</p>
            {composiciones.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No hay composiciones registradas.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {composiciones.map((comp) => {
                  const count = (miembrosPorComposicion.get(comp.id) ?? []).length;
                  const isActive = selectedComposicionId === comp.id;
                  return (
                    <li key={comp.id}>
                      <div className={`rounded-xl border p-2.5 ${isActive ? "border-blue-200 bg-blue-50" : "border-slate-200"}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectComposicion(comp.id)}
                          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm text-slate-700"
                        >
                          <span className="font-medium">{comp.nombre}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {count}
                          </span>
                        </button>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => exportarExcel(comp.id, comp.nombre)}
                            className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => exportarPdf(comp.id, comp.nombre)}
                            className="rounded-lg border border-amber-200 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {selectedComposicionId === null ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-sm text-slate-500">
              Selecciona una composicion para ver y exportar su reporte.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Composicion seleccionada
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {composicionNombre} <span className="font-normal text-slate-500">({miembros.length})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportarSeleccionActual("excel")}
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Exportar Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => exportarSeleccionActual("pdf")}
                      className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      Exportar PDF
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, documento o sindicato..."
                  value={searchMiembros}
                  onChange={(e) => setSearchMiembros(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="p-3">
                {filteredMiembros.length > 0 ? (
                  <>
                    <ul className="mt-1 space-y-1">
                      {pagedMiembros.map((s) => (
                        <li key={s.id}>
                          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                            <span>
                              <span className="block text-sm font-medium text-slate-800">{s.nombre}</span>
                              <span className="block text-xs text-slate-500">Doc: {s.documento}</span>
                              <span className="block text-xs text-slate-500">Regional: {s.regional || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Cargo actual: {s.cargo_actual || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Centro: {s.centro || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Email: {s.email || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Telefono: {s.telefono || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Celular: {s.celular || "N/A"}</span>
                              <span className="block text-xs text-slate-500">Sindicatos: {formatSindicatos(s)}</span>
                              <span className="block text-xs text-slate-400">{s.estado || "Activo"}</span>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-400">
                        Pag. {safePageMiembros}/{totalPagesMiembros} · {filteredMiembros.length} resultado(s)
                      </p>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={pageSizeMiembros}
                          onChange={(e) => setPageSizeMiembros(Number(e.target.value))}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400"
                        >
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n} / pag.</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setPageMiembros((p) => Math.max(1, p - 1))}
                          disabled={safePageMiembros === 1}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageMiembros((p) => Math.min(totalPagesMiembros, p + 1))}
                          disabled={safePageMiembros === totalPagesMiembros}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">
                    {searchMiembros ? "Sin resultados." : "Esta composicion no tiene miembros aun."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
