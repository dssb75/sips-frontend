import axios from "axios";
import { CONFIG } from "@/config/environment";
import { httpClient } from "@/services/httpClient";

export interface CalendarDay {
  date: string;
  day: number;
  weekday: string;
  is_holiday: boolean;
  holiday_name?: string;
}

export interface CalendarMonth {
  month: number;
  month_name: string;
  days: CalendarDay[];
}

export interface Holiday {
  date: string;
  name: string;
}

export interface AnnualCalendarResponse {
  year: number;
  months: CalendarMonth[];
  holidays: Holiday[];
}

export interface VigenciaResponse {
  year: number;
}

export interface MonthSelection {
  month: number;
  month_name: string;
  dates: string[];
}

export interface SelectionPreviewResponse {
  year: number;
  selected_dates: string[];
  grouped_by_month: MonthSelection[];
  total_selected: number;
}

export interface SolicitudResumen {
  id: number;
  vigencia: number;
  tipo_solicitud: TipoSolicitud;
  estado: "Pendiente" | "Radicada";
  fecha_creacion: string;
}

export type TipoSolicitud = "creacion" | "cancelacion" | "modificacion";

export interface CreateSolicitudPayload {
  tipo_solicitud: TipoSolicitud;
}

export interface Sindicalizado {
  id: number;
  documento: string;
  nombre: string;
  regional?: string;
  cargo_actual?: string;
  centro?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  sindicatos?: string[];
  estado?: string;
  composicion_id: number;
}

export interface UpsertSindicalizadoPayload {
  documento: string;
  nombre: string;
  estado?: string;
  composicion_id: number;
}

export interface PersonaSolicitudEditor {
  id: number;
  documento: string;
  nombre: string;
  apellido: string;
  regional: string;
  composicion_id: number;
  composicion?: string;
  estado: "OK" | "ERROR" | "NO_ENCONTRADO";
}

export interface Sindicato {
  id: number;
  nombre: string;
  estado?: string;
}

export interface UpsertSindicatoPayload {
  nombre: string;
  estado?: string;
}

export interface Composicion {
  id: number;
  nombre: string;
}

export interface UpsertComposicionPayload {
  nombre: string;
}

export interface PermisoSeleccionado {
  id: number;
  solicitud_id: number;
  persona_id: number;
  fecha: string;
}

export interface SolicitudEditorData {
  solicitud_id: number;
  vigencia: number;
  tipo_solicitud: TipoSolicitud;
  estado: string;
  sindicalizados: PersonaSolicitudEditor[];
  permisos: PermisoSeleccionado[];
  holidays: Holiday[];
}

export interface TogglePermisoPayload {
  solicitud_id: number;
  persona_id: number;
  fecha: string;
}

export interface TogglePermisoResponse {
  selected: boolean;
  permiso: PermisoSeleccionado;
}

export interface BulkPermisoPayload {
  solicitud_id: number;
  composicion_id: number;
  fecha: string;
  selected: boolean;
}

export interface AsignacionPayload {
  sindicalizado_ids: number[];
  composicion_id: number;
}

export interface CargaMasivaSindicalizadosPayload {
  registros: {
    documento: string;
    sindicato: string;
    composicion: string;
  }[];
  confirmar_carga: boolean;
}

export interface CargaMasivaSindicalizadosResponse {
  total: number;
  creados: number;
  omitidos: number;
  errores: number;
  mensajes: string[];
  documentos_creados: string[];
}

export interface BulkPermisoResponse {
  solicitud_id: number;
  fecha: string;
  selected: boolean;
  persona_ids: number[];
  permisos: PermisoSeleccionado[];
}

export interface ConsultaDocumentoPayload {
  tip_docu?: string;
  documento: string;
}

export interface ConsDocum {
  control_r: string;
  tip_docu: string;
  documento: string;
  nombre: string;
  apellido: string;
  sexo: string;
  email: string;
  estado_civil: string;
  celular: string;
  telefono: string;
  direccion: string;
  fecha_nac: string;
  estado: string;
  cod_reg: string;
  regional: string;
  cod_centro: string;
  nom_centro: string;
  cod_cargo: string;
  carg_act: string;
  carg_org: string;
  fec_inicio: string;
  nro_registros: string;
}

const extractApiError = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (typeof error.response?.data?.error === "string" && error.response.data.error.trim()) {
    return error.response.data.error;
  }

  return fallback;
};

const extractMassiveUploadError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "No se pudo realizar la carga masiva de sindicalizados. Error inesperado en el cliente.";
  }

  if (error.code === "ECONNABORTED") {
    return "La carga masiva excedio el tiempo de espera del cliente. Intenta con menos registros por archivo o vuelve a intentar.";
  }

  if (!error.response) {
    return "No se pudo realizar la carga masiva de sindicalizados: el backend no responde. Verifica que este corriendo en http://localhost:8080.";
  }

  const status = error.response.status;
  const backendMessage =
    typeof error.response.data?.error === "string" && error.response.data.error.trim()
      ? error.response.data.error.trim()
      : "sin detalle de backend";

  if (status === 400) {
    return `Carga masiva rechazada (400): ${backendMessage}`;
  }
  if (status === 404) {
    return `Endpoint no encontrado (404): valida la ruta /sindicalizados/carga-masiva y el proxy /api.`;
  }
  if (status >= 500) {
    return `Fallo interno en backend (${status}): ${backendMessage}`;
  }

  return `No se pudo realizar la carga masiva de sindicalizados (${status}): ${backendMessage}`;
};

export const getVigencia = async (): Promise<VigenciaResponse> => {
  try {
    const response = await httpClient.get<VigenciaResponse>(CONFIG.api.endpoints.calendarVigencia);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar la vigencia."));
  }
};

export const getAnnualCalendar = async (): Promise<AnnualCalendarResponse> => {
  try {
    const response = await httpClient.get<AnnualCalendarResponse>(CONFIG.api.endpoints.calendarYear);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el calendario anual."));
  }
};

export const saveSelection = async (selectedDates: string[]): Promise<SelectionPreviewResponse> => {
  try {
    const response = await httpClient.post<SelectionPreviewResponse>(CONFIG.api.endpoints.calendarSelection, {
      selected_dates: selectedDates,
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo guardar la seleccion."));
  }
};

export const getSelectionPreview = async (): Promise<SelectionPreviewResponse> => {
  try {
    const response = await httpClient.get<SelectionPreviewResponse>(CONFIG.api.endpoints.calendarPreview);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar la vista previa."));
  }
};

export const clearCalendarSelection = async (): Promise<void> => {
  try {
    await httpClient.delete(CONFIG.api.endpoints.calendarSelection);
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo limpiar la seleccion."));
  }
};

export const createSolicitud = async (payload: CreateSolicitudPayload): Promise<SolicitudResumen> => {
  try {
    const response = await httpClient.post<SolicitudResumen>(CONFIG.api.endpoints.solicitudesCreate, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo crear la solicitud."));
  }
};

export const listSolicitudes = async (): Promise<SolicitudResumen[]> => {
  try {
    const response = await httpClient.get<SolicitudResumen[]>(CONFIG.api.endpoints.solicitudesList);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudieron cargar las solicitudes."));
  }
};

export const listSolicitudesPendientes = async (): Promise<SolicitudResumen[]> => {
  try {
    const response = await httpClient.get<SolicitudResumen[]>(CONFIG.api.endpoints.solicitudesPending);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudieron cargar las solicitudes pendientes."));
  }
};

export const radicarSolicitud = async (solicitudId: number): Promise<SolicitudResumen> => {
  try {
    const response = await httpClient.post<SolicitudResumen>(CONFIG.api.endpoints.solicitudesRadicar, null, {
      params: { solicitud_id: solicitudId },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo radicar la solicitud."));
  }
};

export const deleteSolicitud = async (solicitudId: number): Promise<void> => {
  try {
    await httpClient.delete(CONFIG.api.endpoints.solicitudesDelete, {
      params: { solicitud_id: solicitudId },
    });
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo eliminar la solicitud."));
  }
};

export const listSindicalizados = async (): Promise<Sindicalizado[]> => {
  try {
    const response = await httpClient.get<Sindicalizado[]>(CONFIG.api.endpoints.sindicalizados);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el listado de sindicalizados."));
  }
};

export const listSindicalizadosByComposicion = async (composicionId: number): Promise<Sindicalizado[]> => {
  try {
    const response = await httpClient.get<Sindicalizado[]>(CONFIG.api.endpoints.sindicalizados, {
      params: { composicion_id: composicionId },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el listado de sindicalizados."));
  }
};

export const getSindicalizadoById = async (id: number): Promise<Sindicalizado> => {
  try {
    const response = await httpClient.get<Sindicalizado>(CONFIG.api.endpoints.sindicalizados, {
      params: { id },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo consultar el sindicalizado."));
  }
};

export const createSindicalizado = async (payload: UpsertSindicalizadoPayload): Promise<Sindicalizado> => {
  try {
    const response = await httpClient.post<Sindicalizado>(CONFIG.api.endpoints.sindicalizados, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo crear el sindicalizado."));
  }
};

export const updateSindicalizado = async (id: number, payload: UpsertSindicalizadoPayload): Promise<Sindicalizado> => {
  try {
    const response = await httpClient.put<Sindicalizado>(CONFIG.api.endpoints.sindicalizados, payload, {
      params: { id },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar el sindicalizado."));
  }
};

export const deleteSindicalizado = async (id: number): Promise<void> => {
  try {
    await httpClient.delete(CONFIG.api.endpoints.sindicalizados, {
      params: { id },
    });
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo eliminar el sindicalizado."));
  }
};

export const listSindicatos = async (): Promise<Sindicato[]> => {
  try {
    const response = await httpClient.get<Sindicato[]>(CONFIG.api.endpoints.sindicatos);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el listado de sindicatos."));
  }
};

export const createSindicato = async (payload: UpsertSindicatoPayload): Promise<Sindicato> => {
  try {
    const response = await httpClient.post<Sindicato>(CONFIG.api.endpoints.sindicatos, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo crear el sindicato."));
  }
};

export const updateSindicato = async (id: number, payload: UpsertSindicatoPayload): Promise<Sindicato> => {
  try {
    const response = await httpClient.put<Sindicato>(CONFIG.api.endpoints.sindicatos, payload, {
      params: { id },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar el sindicato."));
  }
};

export const deleteSindicato = async (id: number): Promise<void> => {
  try {
    await httpClient.delete(CONFIG.api.endpoints.sindicatos, {
      params: { id },
    });
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo eliminar el sindicato."));
  }
};

export const listComposiciones = async (): Promise<Composicion[]> => {
  try {
    const response = await httpClient.get<Composicion[]>(CONFIG.api.endpoints.composiciones);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el listado de composiciones."));
  }
};

export const createComposicion = async (payload: UpsertComposicionPayload): Promise<Composicion> => {
  try {
    const response = await httpClient.post<Composicion>(CONFIG.api.endpoints.composiciones, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo crear la composicion."));
  }
};

export const updateComposicion = async (id: number, payload: UpsertComposicionPayload): Promise<Composicion> => {
  try {
    const response = await httpClient.put<Composicion>(CONFIG.api.endpoints.composiciones, payload, {
      params: { id },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar la composicion."));
  }
};

export const deleteComposicion = async (id: number): Promise<void> => {
  try {
    await httpClient.delete(CONFIG.api.endpoints.composiciones, {
      params: { id },
    });
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo eliminar la composicion."));
  }
};

export const bulkAsignarComposicion = async (payload: AsignacionPayload): Promise<void> => {
  try {
    await httpClient.post(CONFIG.api.endpoints.sindicalizadosAsignar, payload);
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar la asignacion."));
  }
};

export const cargaMasivaSindicalizados = async (
  payload: CargaMasivaSindicalizadosPayload,
): Promise<CargaMasivaSindicalizadosResponse> => {
  try {
    const response = await httpClient.post<CargaMasivaSindicalizadosResponse>(
      `${CONFIG.api.endpoints.sindicalizados}/carga-masiva`,
      payload,
      {
        timeout: 120000,
        suppressBackendDownEvent: true,
      } as { timeout: number; suppressBackendDownEvent: boolean },
    );
    return response.data;
  } catch (error) {
    throw new Error(extractMassiveUploadError(error));
  }
};

export const getSolicitudEditorData = async (solicitudId: number): Promise<SolicitudEditorData> => {
  try {
    const response = await httpClient.get<SolicitudEditorData>(CONFIG.api.endpoints.solicitudesEditor, {
      params: { solicitud_id: solicitudId },
    });
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo cargar el editor de solicitud."));
  }
};

export const togglePermiso = async (payload: TogglePermisoPayload): Promise<TogglePermisoResponse> => {
  try {
    const response = await httpClient.post<TogglePermisoResponse>(CONFIG.api.endpoints.solicitudesPermisosToggle, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar el permiso."));
  }
};

export const bulkPermiso = async (payload: BulkPermisoPayload): Promise<BulkPermisoResponse> => {
  try {
    const response = await httpClient.post<BulkPermisoResponse>(CONFIG.api.endpoints.solicitudesPermisosBulk, payload);
    return response.data;
  } catch (error) {
    throw new Error(extractApiError(error, "No se pudo actualizar la asignacion masiva."));
  }
};

export const consultaDocumento = async (payload: ConsultaDocumentoPayload): Promise<ConsDocum[]> => {
  try {
    const params: Record<string, string> = {
      documento: payload.documento,
    };
    if (payload.tip_docu && payload.tip_docu.trim()) {
      params.tip_docu = payload.tip_docu;
    }

    const response = await httpClient.get<ConsDocum[]>(CONFIG.api.endpoints.busdatosConsultaDocumento, {
      params,
      // Evita el flujo global que cierra sesion cuando el backend no esta disponible.
      suppressBackendDownEvent: true,
    } as { params: Record<string, string>; suppressBackendDownEvent: boolean });
    return response.data;
  } catch (error) {
    const apiError = extractApiError(error, "El servicio SOAP no esta disponible en este momento.");
    if (apiError.toLowerCase().includes("cod_ac es requerido")) {
      throw new Error("El backend requiere BUSDATOS_CODAC en .env. Configuralo y reinicia el backend.   ");
    }
    throw new Error(apiError);
  }
};
