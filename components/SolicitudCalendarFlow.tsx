"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BulkPermisoPayload,
  Composicion,
  Holiday,
  PersonaSolicitudEditor,
  SolicitudEditorData,
  SolicitudResumen,
  TipoSolicitud,
  bulkPermiso,
  createSolicitud,
  deleteSolicitud,
  getSolicitudEditorData,
  listComposiciones,
  listSolicitudes,
  radicarSolicitud,
  togglePermiso,
} from "@/services/calendar";

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const formatMonthDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const buildMonthDays = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = formatMonthDate(year, month, day);
    const weekdayLabel = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${date}T00:00:00`));
    return {
      day,
      date,
      weekdayLabel: weekdayLabel.slice(0, 2).toUpperCase(),
    };
  });
};

const getInitialMonth = (year: number) => {
  const today = new Date();
  return today.getFullYear() === year ? today.getMonth() + 1 : 1;
};

type Step = 1 | 2 | 3;
type ViewMode = "pending" | "readonly";

type SelectedPermisoPreview = {
  personaId: number;
  personaNombre: string;
  personaDocumento: string;
  personaRegional: string;
  personaComposicion: string;
  fecha: string;
  holidayName: string | undefined;
};

const getPersonaNombre = (persona: PersonaSolicitudEditor) => {
  const value = `${persona.nombre} ${persona.apellido}`.trim();
  return value || `Documento ${persona.documento || persona.id}`;
};

const tipoSolicitudOptions: Array<{ value: TipoSolicitud; label: string }> = [
  { value: "creacion", label: "Creacion" },
  { value: "cancelacion", label: "Cancelacion" },
  { value: "modificacion", label: "Modificacion" },
];

const tipoSolicitudLabel: Record<TipoSolicitud, string> = {
  creacion: "Creacion",
  cancelacion: "Cancelacion",
  modificacion: "Modificacion",
};

const getTipoSolicitudLabel = (value?: string) => {
  if (!value) {
    return "Sin tipo";
  }

  return tipoSolicitudLabel[value as TipoSolicitud] ?? value;
};

export default function SolicitudCalendarFlow() {
  const [step, setStep] = useState<Step>(1);
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[]>([]);
  const [activeSolicitudId, setActiveSolicitudId] = useState<number | null>(null);
  const [editorData, setEditorData] = useState<SolicitudEditorData | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedComposicionId, setSelectedComposicionId] = useState<number | null>(null);
  const [composiciones, setComposiciones] = useState<Composicion[]>([]);
  const [sindicalizadosPorComposicion, setSindicalizadosPorComposicion] = useState<PersonaSolicitudEditor[]>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(1);
  const [bulkDate, setBulkDate] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [loadingComposiciones, setLoadingComposiciones] = useState(false);
  const [creatingSolicitud, setCreatingSolicitud] = useState(false);
  const [deletingSolicitud, setDeletingSolicitud] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [radicando, setRadicando] = useState(false);
  const [tipoSolicitudNueva, setTipoSolicitudNueva] = useState<TipoSolicitud | "">("");
  const [deleteConfirmSolicitudId, setDeleteConfirmSolicitudId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const activeSolicitud = useMemo(
    () => (activeSolicitudId ? solicitudes.find((item) => item.id === activeSolicitudId) ?? null : null),
    [activeSolicitudId, solicitudes],
  );

  const hasActivePendingWork = useMemo(
    () => !!activeSolicitud && activeSolicitud.estado === "Pendiente" && !!editorData,
    [activeSolicitud, editorData],
  );

  const pendingSolicitudes = useMemo(
    () => solicitudes.filter((item) => item.estado === "Pendiente"),
    [solicitudes],
  );

  const loadSolicitudes = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await listSolicitudes();
      setSolicitudes(list);

      if (activeSolicitudId) {
        const found = list.find((item) => item.id === activeSolicitudId);
        if (!found || found.estado !== "Pendiente") {
          setActiveSolicitudId(null);
          setEditorData(null);
          setSelectedKeys(new Set());
          setViewMode("pending");
          setStep(1);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las solicitudes.");
    } finally {
      setLoadingList(false);
    }
  };

  const loadEditor = async (
    solicitudId: number,
    options?: { allowReadonly?: boolean; targetStep?: Step },
  ) => {
    setLoadingEditor(true);
    setLoadingComposiciones(true);
    setError(null);
    try {
      const data = await getSolicitudEditorData(solicitudId);
      if (data.estado !== "Pendiente" && !options?.allowReadonly) {
        setError("Solo puedes retomar solicitudes pendientes.");
        setStep(1);
        return;
      }

      const currentMode: ViewMode = data.estado === "Pendiente" ? "pending" : "readonly";
      setViewMode(currentMode);
      setEditorData(data);
      const initialMonth = getInitialMonth(data.vigencia);
      setCurrentMonth(initialMonth);
      setBulkDate(formatMonthDate(data.vigencia, initialMonth, 1));

      const keys = new Set<string>();
      data.permisos.forEach((permiso) => {
        keys.add(`${permiso.persona_id}|${permiso.fecha}`);
      });
      setSelectedKeys(keys);
      
      // Cargar composiciones
      const comp = await listComposiciones();
      setComposiciones(comp);

      const defaultComposicion = comp[0] ?? null;
      if (defaultComposicion) {
        setSelectedComposicionId(defaultComposicion.id);
        setSindicalizadosPorComposicion(
          data.sindicalizados.filter((persona) => persona.composicion_id === defaultComposicion.id),
        );
      } else {
        setSelectedComposicionId(null);
        setSindicalizadosPorComposicion([]);
      }
      
      setStep(options?.targetStep ?? (currentMode === "pending" ? 2 : 3));
    } catch (editorError) {
      setError(editorError instanceof Error ? editorError.message : "No se pudo cargar la solicitud.");
      setEditorData(null);
      setSelectedKeys(new Set());
    } finally {
      setLoadingEditor(false);
      setLoadingComposiciones(false);
    }
  };

  useEffect(() => {
    void loadSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSolicitud = async () => {
    if (hasActivePendingWork) {
      setError(`Ya tienes una solicitud activa en trabajo (#${activeSolicitudId}). Finaliza o elimina esa solicitud antes de crear otra.`);
      return;
    }

    if (!tipoSolicitudNueva) {
      setError("Debes seleccionar el tipo de solicitud.");
      return;
    }

    setError(null);
    setInfo(null);
    setCreatingSolicitud(true);
    try {
      const created = await createSolicitud({ tipo_solicitud: tipoSolicitudNueva });
      setInfo(`Solicitud ${created.id} creada en estado Pendiente (${getTipoSolicitudLabel(created.tipo_solicitud)}).`);
      await loadSolicitudes();
      setActiveSolicitudId(created.id);
      setTipoSolicitudNueva("");
      await loadEditor(created.id, { allowReadonly: false, targetStep: 2 });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la solicitud.");
    } finally {
      setCreatingSolicitud(false);
    }
  };

  const handleResumeSolicitud = async (solicitudId: number) => {
    setActiveSolicitudId(solicitudId);
    await loadEditor(solicitudId, { allowReadonly: false, targetStep: 2 });
  };

  const handleViewDetalle = async (solicitudId: number) => {
    setActiveSolicitudId(solicitudId);
    await loadEditor(solicitudId, { allowReadonly: true, targetStep: 3 });
  };

  const openDeleteConfirm = (solicitudId?: number) => {
    const targetSolicitudId = solicitudId ?? activeSolicitudId;
    if (!targetSolicitudId) {
      return;
    }

    setDeleteConfirmSolicitudId(targetSolicitudId);
  };

  const closeDeleteConfirm = () => {
    if (deletingSolicitud) {
      return;
    }
    setDeleteConfirmSolicitudId(null);
  };

  useEffect(() => {
    if (deleteConfirmSolicitudId === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDeleteConfirm();
        return;
      }

      if (event.key === "Enter" && !deletingSolicitud) {
        event.preventDefault();
        void handleDeleteSolicitud();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteConfirmSolicitudId, deletingSolicitud]);

  const handleDeleteSolicitud = async () => {
    const targetSolicitudId = deleteConfirmSolicitudId;
    if (!targetSolicitudId) {
      return;
    }


    setDeletingSolicitud(true);
    setError(null);
    setInfo(null);
    try {
      await deleteSolicitud(targetSolicitudId);
      setInfo(`Solicitud ${targetSolicitudId} eliminada.`);

      if (activeSolicitudId === targetSolicitudId) {
        setActiveSolicitudId(null);
        setEditorData(null);
        setSelectedKeys(new Set());
        setSelectedComposicionId(null);
        setSindicalizadosPorComposicion([]);
        setViewMode("pending");
        setStep(1);
      }

      await loadSolicitudes();
      setDeleteConfirmSolicitudId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la solicitud.");
    } finally {
      setDeletingSolicitud(false);
    }
  };

  const handleTogglePermiso = async (personaId: number, fecha: string) => {
    if (!activeSolicitudId) {
      return;
    }

    const actionKey = `${personaId}|${fecha}`;
    setProcessingKey(actionKey);
    setError(null);

    try {
      const response = await togglePermiso({
        solicitud_id: activeSolicitudId,
        persona_id: personaId,
        fecha,
      });

      setSelectedKeys((current) => {
        const next = new Set(current);
        if (response.selected) {
          next.add(actionKey);
        } else {
          next.delete(actionKey);
        }
        return next;
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el permiso.");
    } finally {
      setProcessingKey(null);
    }
  };

  const handleToggleSelectedPerson = (personaId: number) => {
    // Esta función ya no se utiliza con la nueva lógica de composición
  };

  const handleSelectComposicion = async (composicionId: number) => {
    setSelectedComposicionId(composicionId);
    setError(null);
    if (!editorData) {
      setSindicalizadosPorComposicion([]);
      return;
    }

    const personas = editorData.sindicalizados.filter((persona) => persona.composicion_id === composicionId);
    setSindicalizadosPorComposicion(personas);
  };

  const handleBulkAction = async (selected: boolean) => {
    if (!activeSolicitudId || !selectedComposicionId || !bulkDate) {
      return;
    }

    const payload: BulkPermisoPayload = {
      solicitud_id: activeSolicitudId,
      composicion_id: selectedComposicionId,
      fecha: bulkDate,
      selected,
    };

    setProcessingBulk(true);
    setError(null);
    setInfo(null);
    try {
      const response = await bulkPermiso(payload);
      const actionKeyList = response.persona_ids.map((personaId) => `${personaId}|${bulkDate}`);
      setSelectedKeys((current) => {
        const next = new Set(current);
        actionKeyList.forEach((key) => {
          if (selected) {
            next.add(key);
          } else {
            next.delete(key);
          }
        });
        return next;
      });
      setInfo(
        selected
          ? `Fecha asignada a ${response.persona_ids.length} personas de la composición seleccionada.`
          : "Fecha retirada de las personas de la composición seleccionada."
      );
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "No se pudo aplicar la asignacion masiva.");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleMonthChange = (month: number) => {
    if (!editorData) {
      return;
    }
    setCurrentMonth(month);
    setBulkDate(formatMonthDate(editorData.vigencia, month, 1));
  };

  const handleGoPreview = () => {
    if (!activeSolicitudId || !editorData) {
      return;
    }
    setStep(3);
  };

  const handleRadicarSolicitud = async () => {
    if (!activeSolicitudId) {
      return;
    }

    setRadicando(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await radicarSolicitud(activeSolicitudId);
      setInfo(`Solicitud ${updated.id} radicada correctamente.`);
      setActiveSolicitudId(null);
      setEditorData(null);
      setSelectedKeys(new Set());
      setSelectedComposicionId(null);
      setSindicalizadosPorComposicion([]);
      setViewMode("pending");
      setStep(1);
      await loadSolicitudes();
    } catch (radicarError) {
      setError(radicarError instanceof Error ? radicarError.message : "No se pudo radicar la solicitud.");
    } finally {
      setRadicando(false);
    }
  };

  const holidaysMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!editorData) {
      return map;
    }

    editorData.holidays.forEach((holiday: Holiday) => {
      map.set(holiday.date, holiday.name);
    });
    return map;
  }, [editorData]);

  const monthDays = useMemo(() => {
    if (!editorData) {
      return [];
    }
    return buildMonthDays(editorData.vigencia, currentMonth);
  }, [currentMonth, editorData]);

  const monthlyAssignedCount = useMemo(() => {
    if (!editorData) {
      return 0;
    }
    const monthPrefix = `${editorData.vigencia}-${String(currentMonth).padStart(2, "0")}-`;
    return Array.from(selectedKeys).filter((key) => key.includes(`|${monthPrefix}`)).length;
  }, [currentMonth, editorData, selectedKeys]);

  const selectedPeopleCount = sindicalizadosPorComposicion.length;
  const bulkDateMonth = bulkDate ? Number.parseInt(bulkDate.split("-")[1] ?? "0", 10) : 0;
  const isBulkDateInCurrentMonth = bulkDateMonth === currentMonth;
  const canRunBulkAction = !!activeSolicitudId && !!selectedComposicionId && selectedPeopleCount > 0 && !!bulkDate && isBulkDateInCurrentMonth;

  const selectedPreview = useMemo<SelectedPermisoPreview[]>(() => {
    if (!editorData) {
      return [];
    }

    const peopleMap = new Map<number, PersonaSolicitudEditor>();
    editorData.sindicalizados.forEach((persona) => {
      peopleMap.set(persona.id, persona);
    });

    const preview = Array.from(selectedKeys)
      .map((key) => {
        const [personaIdText, fecha] = key.split("|");
        const personaId = Number.parseInt(personaIdText, 10);
        if (!personaId || !fecha) {
          return null;
        }

        const persona = peopleMap.get(personaId);
        return {
          personaId,
          personaNombre: persona ? getPersonaNombre(persona) : `Persona ${personaId}`,
          personaDocumento: persona?.documento || "",
          personaRegional: persona?.regional || "",
          personaComposicion:
            persona?.composicion ||
            composiciones.find((comp) => comp.id === persona?.composicion_id)?.nombre ||
            "",
          fecha,
          holidayName: holidaysMap.get(fecha),
        };
      })
      .filter((item): item is SelectedPermisoPreview => item !== null);

    preview.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.personaNombre.localeCompare(b.personaNombre, "es");
      }
      return a.fecha.localeCompare(b.fecha);
    });

    return preview;
  }, [composiciones, editorData, holidaysMap, selectedKeys]);

  const canRadicar = selectedPreview.length > 0;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gestion de solicitudes</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">Flujo de permisos</h1>
            {activeSolicitud ? (
              <p className="mt-2 text-sm font-semibold text-blue-700">
                Trabajando en solicitud #{activeSolicitud.id} · {getTipoSolicitudLabel(activeSolicitud.tipo_solicitud)} · {activeSolicitud.estado}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Selecciona o crea una solicitud para iniciar el flujo.</p>
            )}
          </div>
          {step === 1 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={tipoSolicitudNueva}
                onChange={(event) => setTipoSolicitudNueva(event.target.value as TipoSolicitud | "")}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="">Tipo de solicitud</option>
                {tipoSolicitudOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleCreateSolicitud()}
                disabled={creatingSolicitud || !tipoSolicitudNueva || hasActivePendingWork}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingSolicitud ? "Creando..." : "Nueva solicitud"}
              </button>
            </div>
          ) : null}
        </div>

        {activeSolicitudId ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              1. Solicitudes
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={viewMode !== "pending"}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 2 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"} disabled:opacity-50`}
            >
              2. Seleccion permisos
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 3 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              3. Vista previa
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              1. Solicitudes
            </button>
          </div>
        )}
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</div> : null}
      {hasActivePendingWork && step === 1 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Tienes una solicitud pendiente activa (#{activeSolicitudId}). Usa "Retomar" en esa misma solicitud para continuar y evitar mezclar cambios.
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Pendientes para retomar</h2>
            {loadingList ? (
              <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
            ) : pendingSolicitudes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                No hay solicitudes pendientes.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {pendingSolicitudes.map((solicitud) => (
                  <li key={solicitud.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">Solicitud #{solicitud.id}</p>
                    <p className="text-xs text-slate-500">Vigencia {solicitud.vigencia}</p>
                    <p className="text-xs text-slate-500">Tipo {getTipoSolicitudLabel(solicitud.tipo_solicitud)}</p>
                    <button
                      type="button"
                      onClick={() => void handleResumeSolicitud(solicitud.id)}
                      disabled={hasActivePendingWork && activeSolicitudId !== solicitud.id}
                      className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Retomar solicitud pendiente
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Listado de solicitudes</h2>
            {loadingList ? (
              <p className="mt-4 text-sm text-slate-500">Cargando listado...</p>
            ) : solicitudes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Aun no hay solicitudes registradas.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Vigencia</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                        <td className="px-4 py-3 font-semibold text-slate-800">#{item.id}</td>
                        <td className="px-4 py-3">{item.vigencia}</td>
                        <td className="px-4 py-3">{getTipoSolicitudLabel(item.tipo_solicitud)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.estado === "Radicada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">{new Date(item.fecha_creacion).toLocaleDateString("es-CO")}</td>
                        <td className="px-4 py-3">
                          {item.estado === "Pendiente" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleResumeSolicitud(item.id)}
                                disabled={hasActivePendingWork && activeSolicitudId !== item.id}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Retomar
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(item.id)}
                                disabled={deletingSolicitud || (hasActivePendingWork && activeSolicitudId !== item.id)}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleViewDetalle(item.id)}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Ver detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        !activeSolicitudId || loadingEditor || !editorData ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Selecciona una solicitud pendiente en el paso 1.</p>
          </div>
        ) : viewMode === "readonly" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">La solicitud activa ya esta radicada. La edicion de permisos esta bloqueada.</p>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ir a vista previa
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Solicitud #{editorData.solicitud_id}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Vigencia {editorData.vigencia}</span>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-800">Tipo {getTipoSolicitudLabel(editorData.tipo_solicitud)}</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">{editorData.estado}</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">Mes actual: {monthlyAssignedCount}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Volver al listado
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm()}
                    disabled={deletingSolicitud}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingSolicitud ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {monthNames.map((monthName, index) => {
                  const monthValue = index + 1;
                  const isActive = currentMonth === monthValue;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => handleMonthChange(monthValue)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                        isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Asignacion masiva</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-800">Selecciona composición</h3>
                </div>

                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Composición
                  <select
                    value={selectedComposicionId || ""}
                    onChange={(event) => {
                      const id = event.target.value ? Number.parseInt(event.target.value, 10) : null;
                      if (id !== null) {
                        void handleSelectComposicion(id);
                      } else {
                        setSelectedComposicionId(null);
                        setSindicalizadosPorComposicion([]);
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                    disabled={loadingComposiciones}
                  >
                    <option value="">
                      {loadingComposiciones ? "Cargando composiciones..." : "Selecciona una composición"}
                    </option>
                    {composiciones.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Fecha del mes
                  <input
                    type="date"
                    value={bulkDate}
                    min={formatMonthDate(editorData.vigencia, currentMonth, 1)}
                    max={formatMonthDate(editorData.vigencia, currentMonth, monthDays.length || 1)}
                    onChange={(event) => setBulkDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  />
                </label>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkAction(true)}
                    disabled={!canRunBulkAction || processingBulk}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Asignar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkAction(false)}
                    disabled={!canRunBulkAction || processingBulk}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    Retirar
                  </button>
                </div>

                {!isBulkDateInCurrentMonth && bulkDate ? <p className="mt-3 text-xs text-red-600">La fecha debe pertenecer al mes seleccionado.</p> : null}

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Composición seleccionada</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {selectedComposicionId
                      ? `${sindicalizadosPorComposicion.length} personas en la composición`
                      : "Selecciona una composición"}
                  </p>
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                  {loadingComposiciones
                    ? "Cargando composiciones..."
                    : "Las personas se muestran directamente en la grilla del mes para la composición seleccionada."}
                </div>
              </aside>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{monthNames[currentMonth - 1]} {editorData.vigencia}</h3>
                    <p className="mt-1 text-sm text-slate-500">Selecciona permisos por persona y dia.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoPreview}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Ir a vista previa
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[980px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                          Persona
                        </th>
                        {monthDays.map((day) => {
                          const isHoliday = holidaysMap.has(day.date);
                          return (
                            <th
                              key={day.date}
                              title={isHoliday ? holidaysMap.get(day.date) : day.date}
                              className={`border-b border-slate-200 px-2 py-3 text-center text-xs font-semibold ${
                                isHoliday ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-500"
                              }`}
                            >
                              <span className="block text-[10px] uppercase">{day.weekdayLabel}</span>
                              <span className="block text-sm">{day.day}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sindicalizadosPorComposicion.length > 0 ? (
                        sindicalizadosPorComposicion.map((persona) => (
                          <tr key={persona.id}>
                            <td className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
                              <p className="text-sm font-semibold text-slate-800">{getPersonaNombre(persona)}</p>
                              <p className="text-xs text-slate-500">Doc: {persona.documento || "N/A"}</p>
                              <p className="text-xs text-slate-500">Reg: {persona.regional || "N/A"}</p>
                              <p className="text-xs text-slate-500">Estado: {persona.estado}</p>
                            </td>
                            {monthDays.map((day) => {
                              const key = `${persona.id}|${day.date}`;
                              const isSelected = selectedKeys.has(key);
                              const isHoliday = holidaysMap.has(day.date);
                              const isProcessing = processingKey === key;

                              return (
                                <td key={key} className="border-b border-slate-200 px-1 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => void handleTogglePermiso(persona.id, day.date)}
                                    disabled={isProcessing}
                                    title={isHoliday ? `${day.date} - ${holidaysMap.get(day.date)}` : day.date}
                                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                                      isSelected
                                        ? isHoliday
                                          ? "bg-rose-500 text-white"
                                          : "bg-blue-600 text-white"
                                        : isHoliday
                                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                          : "bg-slate-100 text-slate-700 hover:bg-blue-100"
                                    } ${isProcessing ? "opacity-70" : ""}`}
                                  >
                                    {day.day}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={monthDays.length + 1} className="border-b border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                            {selectedComposicionId ? "No hay sindicalizados en la composición seleccionada." : "Selecciona una composición para ver los sindicalizados."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}

      {step === 3 ? (
        !activeSolicitudId || !editorData ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Selecciona una solicitud pendiente en el paso 1.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paso 3</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-800">Vista previa de permisos seleccionados</h3>
                <p className="mt-1 text-sm text-slate-500">Verifica antes de radicar. Al radicar, el estado pasa a Radicada.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${viewMode === "readonly" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {viewMode === "readonly" ? "Radicada" : "Pendiente"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {selectedPreview.length} seleccionados
                </span>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {viewMode === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Volver a seleccion
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRadicarSolicitud()}
                    disabled={!canRadicar || radicando}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {radicando ? "Radicando..." : "Radicar solicitud"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Volver al listado
                </button>
              )}
            </div>

            {selectedPreview.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No hay permisos seleccionados. Debes seleccionar al menos uno para radicar.
              </p>
            ) : (
              <div className="max-h-[460px] overflow-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Persona</th>
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Regional</th>
                      <th className="px-4 py-3">Composicion</th>
                      <th className="px-4 py-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPreview.map((item) => (
                      <tr key={`${item.personaId}|${item.fecha}`} className="border-b border-slate-100 text-sm text-slate-700">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.fecha}</td>
                        <td className="px-4 py-3">{item.personaNombre}</td>
                        <td className="px-4 py-3">{item.personaDocumento || "N/A"}</td>
                        <td className="px-4 py-3">{item.personaRegional || "N/A"}</td>
                        <td className="px-4 py-3">{item.personaComposicion || "N/A"}</td>
                        <td className="px-4 py-3">
                          {item.holidayName ? (
                            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                              Festivo: {item.holidayName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Dia habil</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : null}

      {deleteConfirmSolicitudId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Confirmar eliminacion de solicitud">
            <h3 className="text-lg font-semibold text-slate-800">Confirmar eliminacion</h3>
            <p className="mt-2 text-sm text-slate-600">
              Se eliminara la solicitud #{deleteConfirmSolicitudId} con todos sus permisos. Esta accion no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deletingSolicitud}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSolicitud()}
                disabled={deletingSolicitud}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingSolicitud ? "Eliminando..." : "Eliminar solicitud"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
