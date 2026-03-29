"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  bulkAsignarComposicion,
  CargaMasivaSindicalizadosResponse,
  Composicion,
  cargaMasivaSindicalizados,
  consultaDocumento,
  createSindicalizado,
  deleteSindicalizado,
  listComposiciones,
  listSindicatos,
  listSindicalizados,
  Sindicato,
  Sindicalizado,
  updateSindicalizado,
} from "@/services/calendar";
import * as XLSX from "xlsx";

type CargaMasivaRegistro = {
  documento: string;
  sindicato: string;
  composicion: string;
};

type CargaMasivaPreview = {
  totalFilas: number;
  validos: number;
  invalidos: number;
  duplicados: number;
  existentes: number;
  nuevos: number;
  sindicatosNuevos: string[];
  composicionesNuevas: string[];
  erroresMuestra: string[];
  registrosValidos: CargaMasivaRegistro[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type UpsertFormState = {
  documento: string;
  composicionId: string;
};

export default function SindicalizadosPage() {
  const [items, setItems] = useState<Sindicalizado[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<UpsertFormState>({ documento: "", composicionId: "" });
  const [editingItem, setEditingItem] = useState<Sindicalizado | null>(null);
  const [editForm, setEditForm] = useState<UpsertFormState>({ documento: "", composicionId: "" });
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkComposicionId, setBulkComposicionId] = useState("");
  const [deletingItem, setDeletingItem] = useState<Sindicalizado | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterEstado, setFilterEstado] = useState<"Todos" | "Activo" | "Inactivo">("Todos");
  const [filterComposicion, setFilterComposicion] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [massiveFile, setMassiveFile] = useState<File | null>(null);
  const [massivePreview, setMassivePreview] = useState<CargaMasivaPreview | null>(null);
  const [previewingMassive, setPreviewingMassive] = useState(false);
  const [processingMassive, setProcessingMassive] = useState(false);
  const [massiveResult, setMassiveResult] = useState<CargaMasivaSindicalizadosResponse | null>(null);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const composicionNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const composicion of composiciones) {
      map.set(composicion.id, composicion.nombre);
    }
    return map;
  }, [composiciones]);

  const loadData = async (options?: { silent?: boolean }): Promise<boolean> => {
    const silent = options?.silent === true;
    setLoading(true);
    if (!silent) {
      setDataLoadError(null);
    }
    try {
      const [sindicalizadosResponse, composicionesResponse, sindicatosResponse] = await Promise.all([
        listSindicalizados(),
        listComposiciones(),
        listSindicatos(),
      ]);
      setItems(sindicalizadosResponse);
      setComposiciones(composicionesResponse);
      setSindicatos(sindicatosResponse);
      setSelectedIds(new Set());
      if (!silent) {
        setDataLoadError(null);
      }
      return true;
    } catch (loadError) {
      if (!silent) {
        setDataLoadError(loadError instanceof Error ? loadError.message : "No se pudo cargar el modulo de sindicalizados.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedName = filterName.trim().toLowerCase();
    const composicionFilterID = Number.parseInt(filterComposicion, 10);
    const hasComposicionFilter = Number.isFinite(composicionFilterID) && composicionFilterID > 0;

    return items.filter((item) => {
      if (normalizedName && !item.nombre.toLowerCase().includes(normalizedName)) {
        return false;
      }

      const itemEstado = (item.estado || "Activo").toLowerCase();
      if (filterEstado !== "Todos" && itemEstado !== filterEstado.toLowerCase()) {
        return false;
      }

      if (hasComposicionFilter && item.composicion_id !== composicionFilterID) {
        return false;
      }

      return true;
    });
  }, [filterComposicion, filterEstado, filterName, items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterEstado, filterComposicion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ documento: "", composicionId: "" });
  };

  const resolveAutoPayloadFromDocumento = async (documentoInput: string, composicionIdInput?: number) => {
    const documento = documentoInput.trim();
    if (!documento) {
      throw new Error("El documento es obligatorio.");
    }

    const composicionSeleccionada = typeof composicionIdInput === "number" && composicionIdInput > 0
      ? composiciones.find((item) => item.id === composicionIdInput)
      : composiciones[0];

    if (!composicionSeleccionada) {
      throw new Error("Debes crear al menos una composicion activa para guardar sindicalizados.");
    }

    const soapRows = await consultaDocumento({ documento });
    if (soapRows.length === 0) {
      throw new Error("No se encontro informacion SOAP para el documento ingresado.");
    }

    const firstRow = soapRows[0];
    if (firstRow.control_r?.trim()) {
      throw new Error(firstRow.control_r);
    }

    const nombreCompleto = [firstRow.nombre, firstRow.apellido].filter(Boolean).join(" ").trim();
    if (!nombreCompleto) {
      throw new Error("La respuesta SOAP no devolvio nombres para este documento.");
    }

    return {
      documento,
      nombre: nombreCompleto,
      estado: "Activo" as const,
      composicion_id: composicionSeleccionada.id,
    };
  };

  const hasOpenModal = showCreateModal || editingItem !== null || deletingItem !== null;

  useEffect(() => {
    if (!hasOpenModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();

        if (deletingItem) {
          if (deletingId === deletingItem.id) {
            return;
          }
          setDeletingItem(null);
          return;
        }

        if (editingItem) {
          if (updatingId === editingItem.id) {
            return;
          }
          cancelUpdate();
          return;
        }

        if (showCreateModal) {
          if (creating) {
            return;
          }
          closeCreateModal();
          return;
        }

        return;
      }

      if (event.key === "Enter" && deletingItem && deletingId !== deletingItem.id) {
        event.preventDefault();
        void handleDelete();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    creating,
    deletingId,
    deletingItem,
    editingItem,
    hasOpenModal,
    showCreateModal,
    updatingId,
  ]);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreating(true);
    setError(null);
    setInfo(null);
    try {
      const payload = await resolveAutoPayloadFromDocumento(createForm.documento);
      await createSindicalizado(payload);
      setInfo("Sindicalizado creado con datos consultados en SOAP.");
      closeCreateModal();
      await loadData();
      setCurrentPage(totalPages);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el sindicalizado.");
    } finally {
      setCreating(false);
    }
  };

  const startUpdate = (item: Sindicalizado) => {
    setEditingItem(item);
    setEditForm({
      documento: item.documento || "",
      composicionId: String(item.composicion_id || ""),
    });
    setError(null);
    setInfo(null);
  };

  const cancelUpdate = () => {
    setEditingItem(null);
    setEditForm({ documento: "", composicionId: "" });
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem) {
      return;
    }

    setUpdatingId(editingItem.id);
    setError(null);
    setInfo(null);
    try {
      const composicionId = Number.parseInt(editForm.composicionId, 10);
      if (!Number.isFinite(composicionId) || composicionId <= 0) {
        throw new Error("Selecciona una composicion valida.");
      }

      const payload = await resolveAutoPayloadFromDocumento(editForm.documento, composicionId);
      await updateSindicalizado(editingItem.id, payload);
      setInfo("Sindicalizado actualizado y composicion cambiada correctamente.");
      cancelUpdate();
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el sindicalizado.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) {
      return;
    }

    setDeletingId(deletingItem.id);
    setError(null);
    setInfo(null);
    try {
      await deleteSindicalizado(deletingItem.id);
      setInfo("Sindicalizado eliminado.");
      setDeletingItem(null);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el sindicalizado.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPaged = () => {
    const ids = pagedItems.map((item) => item.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    setBulkDeleting(true);
    setError(null);
    setInfo(null);

    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteSindicalizado(id);
        deleted++;
      } catch {
        // continue deleting the rest
      }
    }

    if (deleted === ids.length) {
      setInfo(`Se eliminaron ${deleted} sindicalizado(s).`);
    } else {
      setError(`Se eliminaron ${deleted} de ${ids.length} sindicalizados seleccionados.`);
    }

    await loadData();
    setBulkDeleting(false);
  };

  const openBulkUpdateModal = () => {
    if (selectedIds.size === 0) {
      setError("Selecciona al menos un sindicalizado para actualizar composicion en masa.");
      return;
    }

    setBulkComposicionId("");
    setShowBulkUpdateModal(true);
    setError(null);
    setInfo(null);
  };

  const handleBulkUpdateComposicion = async () => {
    if (selectedIds.size === 0) {
      setError("Selecciona al menos un sindicalizado para actualizar composicion en masa.");
      return;
    }

    const composicionId = Number.parseInt(bulkComposicionId, 10);
    if (!Number.isFinite(composicionId) || composicionId <= 0) {
      setError("Selecciona una composicion valida para la actualizacion masiva.");
      return;
    }

    setBulkDeleting(true);
    setError(null);
    setInfo(null);
    try {
      await bulkAsignarComposicion({
        sindicalizado_ids: Array.from(selectedIds),
        composicion_id: composicionId,
      });
      const composicionNombre = composicionNameById.get(composicionId) || "la composicion seleccionada";
      setInfo(`Composicion actualizada para ${selectedIds.size} sindicalizado(s): ${composicionNombre}.`);
      setSelectedIds(new Set());
      setShowBulkUpdateModal(false);
      await loadData();
    } catch (bulkUpdateError) {
      setError(bulkUpdateError instanceof Error ? bulkUpdateError.message : "No se pudo actualizar la composicion en masa.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const parseRegistrosFromFile = async (file: File): Promise<CargaMasivaRegistro[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return [];
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    if (rows.length === 0) {
      return [];
    }

    const headerRow = Array.isArray(rows[0]) ? rows[0].map((value) => String(value ?? "").trim().toLowerCase()) : [];
    const docIndexFromHeader = headerRow.findIndex((value) => value === "documento" || value === "documentos");
    const sindicatoIndexFromHeader = headerRow.findIndex((value) => value === "sindicato" || value === "sindicatos");
    const composicionIndexFromHeader = headerRow.findIndex((value) => value === "composicion" || value === "composición" || value === "composiciones");
    const hasHeader = docIndexFromHeader >= 0 && sindicatoIndexFromHeader >= 0 && composicionIndexFromHeader >= 0;

    const docIndex = hasHeader ? docIndexFromHeader : 0;
    const sindicatoIndex = hasHeader ? sindicatoIndexFromHeader : 1;
    const composicionIndex = hasHeader ? composicionIndexFromHeader : 2;
    const startRow = hasHeader ? 1 : 0;

    const registros: CargaMasivaRegistro[] = [];
    rows.forEach((row, rowIndex) => {
      if (rowIndex < startRow) {
        return;
      }
      if (!Array.isArray(row) || row.length === 0) {
        return;
      }

      const documento = String(row[docIndex] ?? "").trim();
      const sindicato = String(row[sindicatoIndex] ?? "").trim();
      const composicion = String(row[composicionIndex] ?? "").trim();
      registros.push({ documento, sindicato, composicion });
    });

    return registros;
  };

  const handleMassiveUpload = async () => {
    if (!massivePreview) {
      setError("Primero genera la vista previa del archivo antes de cargar.");
      return;
    }
    if (massivePreview.registrosValidos.length === 0) {
      setError("La vista previa no tiene registros validos para cargar.");
      return;
    }

    setProcessingMassive(true);
    setError(null);
    setInfo(null);
    setMassiveResult(null);
    try {
      const result = await cargaMasivaSindicalizados({
        registros: massivePreview.registrosValidos,
        confirmar_carga: true,
      });

      setMassiveResult(result);
      setInfo(`Carga masiva finalizada: ${result.creados} creados, ${result.omitidos} omitidos, ${result.errores} errores.`);
      setMassiveFile(null);
      setMassivePreview(null);
      const refreshed = await loadData({ silent: true });
      if (!refreshed) {
        setInfo(`Carga masiva finalizada: ${result.creados} creados, ${result.omitidos} omitidos, ${result.errores} errores. Los cambios ya fueron guardados, pero no se pudo refrescar el listado en pantalla.`);
      }
    } catch (massiveError) {
      setError(massiveError instanceof Error ? massiveError.message : "No se pudo completar la carga masiva.");
    } finally {
      setProcessingMassive(false);
    }
  };

  const buildMassivePreview = (registros: CargaMasivaRegistro[]): CargaMasivaPreview => {
    const errores: string[] = [];
    const seenDocSindicato = new Set<string>();
    const docComposicion = new Map<string, string>();
    const seenDocs = new Set<string>();
    const existentesDocs = new Set(items.map((item) => item.documento.trim()).filter(Boolean));
    const sindicatosActuales = new Set(sindicatos.map((item) => item.nombre.trim().toLowerCase()).filter(Boolean));
    const composicionesActuales = new Set(composiciones.map((item) => item.nombre.trim().toLowerCase()).filter(Boolean));
    const sindicatosNuevosSet = new Set<string>();
    const composicionesNuevasSet = new Set<string>();

    let invalidos = 0;
    let duplicados = 0;
    let existentes = 0;
    let nuevos = 0;
    const registrosValidos: CargaMasivaRegistro[] = [];

    registros.forEach((registro, index) => {
      const documento = registro.documento.trim();
      const sindicato = registro.sindicato.trim();
      const composicion = registro.composicion.trim();

      if (!documento || !sindicato || !composicion) {
        invalidos++;
        if (errores.length < 10) {
          errores.push(`Fila ${index + 1}: faltan columnas obligatorias (documento/sindicato/composicion).`);
        }
        return;
      }

      const sindicatoKey = sindicato.toLowerCase();
      if (!sindicatosActuales.has(sindicatoKey)) {
        sindicatosNuevosSet.add(sindicato);
      }

      const composicionKey = composicion.toLowerCase();
      if (!composicionesActuales.has(composicionKey)) {
        composicionesNuevasSet.add(composicion);
      }

      const rowKey = `${documento.toLowerCase()}|${sindicato.toLowerCase()}`;
      if (seenDocSindicato.has(rowKey)) {
        duplicados++;
        if (errores.length < 10) {
          errores.push(`Fila ${index + 1}: documento+sindicato duplicado (${documento} / ${sindicato}).`);
        }
        return;
      }

      const normalizedDocumento = documento.toLowerCase();
      if (!seenDocs.has(normalizedDocumento)) {
        seenDocs.add(normalizedDocumento);
        if (existentesDocs.has(documento)) {
          existentes++;
        } else {
          nuevos++;
        }
      }

      const composicionActual = docComposicion.get(normalizedDocumento);
      if (!composicionActual) {
        docComposicion.set(normalizedDocumento, composicion);
      } else if (composicionActual.toLowerCase() !== composicion.toLowerCase() && errores.length < 10) {
        errores.push(`Fila ${index + 1}: ${documento} viene con composicion distinta; se conservara la primera composicion detectada.`);
      }

      seenDocSindicato.add(rowKey);

      registrosValidos.push({ documento, sindicato, composicion });
    });

    return {
      totalFilas: registros.length,
      validos: registrosValidos.length,
      invalidos,
      duplicados,
      existentes,
      nuevos,
      sindicatosNuevos: Array.from(sindicatosNuevosSet).sort((a, b) => a.localeCompare(b)),
      composicionesNuevas: Array.from(composicionesNuevasSet).sort((a, b) => a.localeCompare(b)),
      erroresMuestra: errores,
      registrosValidos,
    };
  };

  const handleMassivePreview = async () => {
    if (!massiveFile) {
      setError("Selecciona un archivo Excel para previsualizar.");
      return;
    }

    if (dataLoadError) {
      setError("No se pudo consultar el estado actual del backend para validar existentes. Recarga la pagina y verifica conexion antes de previsualizar.");
      return;
    }

    setPreviewingMassive(true);
    setError(null);
    setInfo(null);
    setMassiveResult(null);
    try {
      const registros = await parseRegistrosFromFile(massiveFile);
      if (registros.length === 0) {
        throw new Error("El archivo no contiene registros para procesar.");
      }

      const preview = buildMassivePreview(registros);
      setMassivePreview(preview);
      setInfo(`Vista previa lista: ${preview.validos} validos de ${preview.totalFilas} filas.`);
    } catch (previewError) {
      setMassivePreview(null);
      setError(previewError instanceof Error ? previewError.message : "No se pudo generar la vista previa.");
    } finally {
      setPreviewingMassive(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Modulo de sindicalizados</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">Listado de sindicalizados</h1>
            <p className="mt-2 text-sm text-slate-500">Gestiona sindicalizados y su asignacion a composicion.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openBulkUpdateModal}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              Actualizar composicion ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {bulkDeleting ? "Eliminando..." : `Eliminar seleccionados (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={creating || composiciones.length === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Carga masiva por Excel</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sube un archivo Excel (.xlsx, .xls o .csv) con columnas de documento, sindicato y composicion.
          Si el sindicato o la composicion no existen, se crean automaticamente.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              setMassiveFile(event.target.files?.[0] ?? null);
              setMassivePreview(null);
              setMassiveResult(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => void handleMassivePreview()}
            disabled={previewingMassive || processingMassive || !massiveFile}
            className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {previewingMassive ? "Previsualizando..." : "Vista previa"}
          </button>
          <button
            type="button"
            onClick={() => void handleMassiveUpload()}
            disabled={processingMassive || previewingMassive || !massivePreview}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {processingMassive ? "Procesando..." : "Cargar masivamente"}
          </button>
        </div>

        {massivePreview ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-blue-800">Vista previa de carga</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <p><span className="font-semibold">Filas totales:</span> {massivePreview.totalFilas}</p>
              <p><span className="font-semibold">Validos:</span> {massivePreview.validos}</p>
              <p><span className="font-semibold">Invalidos:</span> {massivePreview.invalidos}</p>
              <p><span className="font-semibold">Duplicados:</span> {massivePreview.duplicados}</p>
              <p><span className="font-semibold">Nuevos:</span> {massivePreview.nuevos}</p>
              <p><span className="font-semibold">Ya existentes:</span> {massivePreview.existentes}</p>
            </div>
            <p className="mt-2 text-xs text-blue-900">
              Se crearan automaticamente {massivePreview.sindicatosNuevos.length} sindicatos y {massivePreview.composicionesNuevas.length} composiciones que no existan.
            </p>
            {massivePreview.erroresMuestra.length > 0 ? (
              <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-xs text-blue-900">
                {massivePreview.erroresMuestra.map((message, idx) => (
                  <li key={`${message}-${idx}`}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {massiveResult ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p><span className="font-semibold">Total:</span> {massiveResult.total}</p>
            <p><span className="font-semibold">Creados:</span> {massiveResult.creados}</p>
            <p><span className="font-semibold">Omitidos:</span> {massiveResult.omitidos}</p>
            <p><span className="font-semibold">Errores:</span> {massiveResult.errores}</p>
            {massiveResult.mensajes.length > 0 ? (
              <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-slate-600">
                {massiveResult.mensajes.map((message, idx) => (
                  <li key={`${message}-${idx}`}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {dataLoadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dataLoadError}
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Filtros de busqueda</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Nombre
            <input
              type="text"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Buscar por nombre"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Estado
            <select
              value={filterEstado}
              onChange={(event) => setFilterEstado(event.target.value as "Todos" | "Activo" | "Inactivo")}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Composicion
            <select
              value={filterComposicion}
              onChange={(event) => setFilterComposicion(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="Todas">Todas</option>
              {composiciones.map((composicion) => (
                <option key={composicion.id} value={String(composicion.id)}>
                  {composicion.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setFilterName("");
            setFilterEstado("Todos");
            setFilterComposicion("Todas");
          }}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando sindicalizados...</p>
        ) : filteredItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            No hay resultados para los filtros aplicados.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={pagedItems.length > 0 && pagedItems.every((item) => selectedIds.has(item.id))}
                        onChange={toggleSelectAllPaged}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Regional</th>
                    <th className="px-4 py-3">Cargo actual</th>
                    <th className="px-4 py-3">Centro</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3">Celular</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Composicion</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="h-4 w-4"
                        />
                      </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.documento}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.nombre}</td>
                      <td className="px-4 py-3">{item.regional || "N/A"}</td>
                      <td className="px-4 py-3">{item.cargo_actual || "N/A"}</td>
                      <td className="px-4 py-3">{item.centro || "N/A"}</td>
                      <td className="px-4 py-3">{item.email || "N/A"}</td>
                      <td className="px-4 py-3">{item.telefono || "N/A"}</td>
                      <td className="px-4 py-3">{item.celular || "N/A"}</td>
                      <td className="px-4 py-3">{item.estado || "Activo"}</td>
                      <td className="px-4 py-3">{composicionNameById.get(item.composicion_id) || "Sin composicion"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startUpdate(item)}
                            disabled={updatingId === item.id || deletingId === item.id}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {updatingId === item.id ? "Actualizando..." : "Actualizar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            disabled={deletingId === item.id || updatingId === item.id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Pagina {safeCurrentPage} de {totalPages} · Mostrando {filteredItems.length} de {items.length}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / pág.</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Agregar sindicalizado">
            <h2 className="text-lg font-semibold text-slate-800">Agregar sindicalizado</h2>
            <form onSubmit={(event) => void handleCreateSubmit(event)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Documento
                <input
                  type="text"
                  value={createForm.documento}
                  onChange={(event) => setCreateForm((current) => ({ ...current, documento: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  required
                />
              </label>
              <p className="text-xs text-slate-500">
                Al guardar, se consultan automaticamente nombre, apellido y regional por SOAP. Se asigna estado Activo y composicion por defecto.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Actualizar sindicalizado">
            <h2 className="text-lg font-semibold text-slate-800">Actualizar sindicalizado</h2>
            <form onSubmit={(event) => void handleUpdateSubmit(event)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Documento
                <input
                  type="text"
                  value={editForm.documento}
                  onChange={(event) => setEditForm((current) => ({ ...current, documento: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Composicion
                <select
                  value={editForm.composicionId}
                  onChange={(event) => setEditForm((current) => ({ ...current, composicionId: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  required
                >
                  <option value="">Selecciona una composicion</option>
                  {composiciones.map((composicion) => (
                    <option key={composicion.id} value={String(composicion.id)}>
                      {composicion.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500">
                Al guardar, se refrescan automaticamente nombre, apellido y regional por SOAP, y se aplica la composicion seleccionada.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={updatingId === editingItem.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {updatingId === editingItem.id ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={cancelUpdate}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showBulkUpdateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Actualizar composicion masiva">
            <h2 className="text-lg font-semibold text-slate-800">Actualizar composicion en masa</h2>
            <p className="mt-2 text-sm text-slate-600">
              Cambiara la composicion de {selectedIds.size} sindicalizado(s) seleccionados.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Nueva composicion
              <select
                value={bulkComposicionId}
                onChange={(event) => setBulkComposicionId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                required
              >
                <option value="">Selecciona una composicion</option>
                {composiciones.map((composicion) => (
                  <option key={composicion.id} value={String(composicion.id)}>
                    {composicion.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleBulkUpdateComposicion()}
                disabled={bulkDeleting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {bulkDeleting ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                type="button"
                onClick={() => setShowBulkUpdateModal(false)}
                disabled={bulkDeleting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Eliminar sindicalizado">
            <h2 className="text-lg font-semibold text-slate-800">Eliminar sindicalizado</h2>
            <p className="mt-3 text-sm text-slate-600">
              Se eliminara el sindicalizado {deletingItem.nombre}. Esta accion no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deletingId === deletingItem.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === deletingItem.id ? "Eliminando..." : "Eliminar"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
