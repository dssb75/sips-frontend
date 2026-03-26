"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { listarTareas, crearTarea, actualizarTarea, eliminarTarea } from "@/services/tareas";
import { MESSAGES } from "@/constants/messages";
import { getAccessToken } from "@/services/session";

/**
 * Tarea: Entidad del dominio
 * Representa una tarea en el sistema con:
 * - id: identificador único generado por la BD
 * - descripcion: texto que describe la tarea
 * - completada: booleano que indica si la tarea está realizada
 */
interface Tarea {
  id: number;
  descripcion: string;
  completada: boolean;
}

/**
 * CrudTareas: Componente principal de gestión de tareas
 *
 * Funcionalidades proporcionadas:
 * 1. Listar: carga todas las tareas desde el backend al montar el componente
 * 2. Crear: agrega una nueva tarea con descripción inicial y estado no completada
 * 3. Actualizar: permite cambiar la descripción o marcar como completada
 * 4. Eliminar: remueve una tarea de la base de datos
 *
 * Reglas de negocio implementadas:
 * - No se permite crear tareas sin descripción (validación de entrada)
 * - Al hacer click en una tarea, se alterna su estado de completitud
 * - La edición inline permite solo cambiar la descripción
 * - La eliminación requiere click pero podría extenderse con confirmación
 * - Las tareas se recargan desde el servidor tras cualquier cambio (refresh list)
 *
 * Patrones utilizados:
 * - React Hooks (useState, useEffect) para manejo de estado
 * - Service layer (services/tareas.ts) para abstracción de llamadas API
 * - Error handling con try-catch en cada operación
 * - Edición inline con modo read-only y edit mode alternables
 */
export default function CrudTareas() {
  const SESSION_REQUIRED_MESSAGE = "Debes iniciar sesion para consultar tareas.";

  // Estado de la lista de tareas
  const [tareas, setTareas] = useState<Tarea[]>([]);

  // Estado para el formulario de creación de nueva tarea
  const [descripcion, setDescripcion] = useState("");

  // Estado para la edición inline: identificador de la tarea en edición
  const [editId, setEditId] = useState<number | null>(null);

  // Estado para la edición inline: descripción temporal durante la edición
  const [editDesc, setEditDesc] = useState("");

  // Estado para indicar si se están cargando las tareas
  const [cargando, setCargando] = useState(true);

  // Estado para mostrar errores al usuario
  const [error, setError] = useState<string | null>(null);

  // Estado de conexión con el backend
  const [backendDisponible, setBackendDisponible] = useState(true);

  const isBackendConnectionError = (err: unknown) => {
    if (!axios.isAxiosError(err)) {
      return false;
    }

    return err.code === "ECONNABORTED" || !err.response;
  };

  const getErrorMessage = (err: unknown, fallbackMessage: string) => {
    if (!axios.isAxiosError(err)) {
      return fallbackMessage;
    }

    if (err.code === "ECONNABORTED") {
      return MESSAGES.ERROR_BACKEND_TIMEOUT;
    }

    if (!err.response) {
      return MESSAGES.ERROR_BACKEND_UNAVAILABLE;
    }

    if (typeof err.response.data?.error === "string" && err.response.data.error.trim()) {
      return err.response.data.error;
    }

    if (err.response.status >= 500) {
      return MESSAGES.ERROR_BACKEND_SERVER;
    }

    return fallbackMessage;
  };

  const cargarTareas = useCallback(async () => {
    if (!getAccessToken()) {
      setTareas([]);
      setCargando(false);
      setBackendDisponible(true);
      setError(SESSION_REQUIRED_MESSAGE);
      return;
    }

    try {
      setCargando(true);
      const res = await listarTareas();
      setTareas(res || []);
      setBackendDisponible(true);
      setError(null);
    } catch (err) {
      console.error("Error al listar tareas:", err);
      setBackendDisponible(!isBackendConnectionError(err) ? true : false);
      setError(getErrorMessage(err, MESSAGES.ERROR_LOAD_FAIL));
    } finally {
      setCargando(false);
    }
  }, []);

  const ensureAuthenticated = () => {
    if (getAccessToken()) {
      return true;
    }

    setError(SESSION_REQUIRED_MESSAGE);
    return false;
  };

  /**
   * useEffect: Carga inicial de tareas
   * Se ejecuta una sola vez al montar el componente (dependencies array vacío)
   * Obtiene la lista completa de tareas del backend y la guarda en el estado
   */
  useEffect(() => {
    void cargarTareas();
  }, [cargarTareas]);

  useEffect(() => {
    const onAuthUpdated = () => {
      void cargarTareas();
    };

    window.addEventListener("sips-auth-updated", onAuthUpdated);
    return () => {
      window.removeEventListener("sips-auth-updated", onAuthUpdated);
    };
  }, [cargarTareas]);

  /**
   * handleCrear: Crea una nueva tarea
   * 
   * Validaciones:
   * - Verifica que la descripción no esté vacía
   * - Si es válida, envía al backend
   * - Luego recarga la lista completa para mantener sincronización
   * 
   * Regla de negocio:
   * - Todas las nuevas tareas comienzan con estado completada=false
   */
  const handleCrear = async () => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!backendDisponible) {
      setError(MESSAGES.ERROR_BACKEND_UNAVAILABLE);
      return;
    }

    if (!descripcion.trim()) {
      setError(MESSAGES.ERROR_EMPTY_DESCRIPTION);
      return;
    }
    try {
      await crearTarea({ descripcion: descripcion.trim(), completada: false });
      setDescripcion("");
      setBackendDisponible(true);
      setError(null);
      await cargarTareas();
    } catch (err) {
      console.error("Error al crear tarea:", err);
      setBackendDisponible(!isBackendConnectionError(err) ? true : false);
      setError(getErrorMessage(err, MESSAGES.ERROR_CREATE_FAIL));
    }
  };

  /**
   * toggleCompletada: Alterna el estado de completitud de una tarea
   * 
   * Regla de negocio:
   * - Es una operación principal: lo más común es hacer click para marcar completada
   * - Se puede hacer click nuevamente para desmarcar
   * - Mantiene el resto de los datos sin cambios
   */
  const toggleCompletada = async (tarea: Tarea) => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!backendDisponible) {
      setError(MESSAGES.ERROR_BACKEND_UNAVAILABLE);
      return;
    }

    try {
      await actualizarTarea({ ...tarea, completada: !tarea.completada });
      setBackendDisponible(true);
      setError(null);
      await cargarTareas();
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      setBackendDisponible(!isBackendConnectionError(err) ? true : false);
      setError(getErrorMessage(err, MESSAGES.ERROR_UPDATE_FAIL));
    }
  };

  /**
   * handleEliminar: Elimina una tarea
   * 
   * Validaciones:
   * - Podría agregarse confirmación: if (!confirm(...)) return;
   * 
   * Regla de negocio:
   * - La eliminación es permanente
   * - Se ejecuta inmediatamente (sin confirmación en esta versión)
   */
  const handleEliminar = async (id: number) => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!backendDisponible) {
      setError(MESSAGES.ERROR_BACKEND_UNAVAILABLE);
      return;
    }

    try {
      await eliminarTarea(id);
      setBackendDisponible(true);
      setError(null);
      await cargarTareas();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
      setBackendDisponible(!isBackendConnectionError(err) ? true : false);
      setError(getErrorMessage(err, MESSAGES.ERROR_DELETE_FAIL));
    }
  };

  /**
   * iniciarEdicion: Prepara el modo de edición inline
   * 
   * Lógica:
   * - Copia los datos de la tarea a los campos de edición
   * - Establece el ID de la tarea en edición (renderiza diferente)
   */
  const iniciarEdicion = (tarea: Tarea) => {
    setEditId(tarea.id);
    setEditDesc(tarea.descripcion);
  };

  /**
   * guardarEdicion: Persiste los cambios de edición inline
   * 
   * Validaciones:
   * - Verifica que la descripción no esté vacía
   * - Mantiene el estado de completitud anterior
   * 
   * Lógica:
   * - Envía la actualización al backend
   * - Limpia el estado de edición
   * - Recarga la lista
   */
  const guardarEdicion = async (id: number) => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!backendDisponible) {
      setError(MESSAGES.ERROR_BACKEND_UNAVAILABLE);
      return;
    }

    if (!editDesc.trim()) {
      setError(MESSAGES.ERROR_EMPTY_DESCRIPTION);
      return;
    }
    try {
      await actualizarTarea({
        id,
        descripcion: editDesc.trim(),
        completada: tareas.find((t) => t.id === id)?.completada ?? false,
      });
      setEditId(null);
      setEditDesc("");
      setBackendDisponible(true);
      setError(null);
      await cargarTareas();
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      setBackendDisponible(!isBackendConnectionError(err) ? true : false);
      setError(getErrorMessage(err, MESSAGES.ERROR_SAVE_FAIL));
    }
  };

  /**
   * cancelarEdicion: Cancela el modo de edición sin guardar
   */
  const cancelarEdicion = () => {
    setEditId(null);
    setEditDesc("");
    setError(null);
  };

  // Renderización
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-start py-8 px-4">
      {/* Encabezado */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">{MESSAGES.APP_TITLE}</h1>
        <p className="text-slate-600">{MESSAGES.APP_SUBTITLE}</p>
      </header>

      {/* Contenedor principal */}
      <div className="w-full max-w-2xl">
        {!backendDisponible && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="text-sm font-semibold">{MESSAGES.BACKEND_STATUS_TITLE}</p>
            <p className="mt-1 text-sm">{error || MESSAGES.ERROR_BACKEND_UNAVAILABLE}</p>
            <p className="mt-1 text-xs text-amber-800">{MESSAGES.BACKEND_STATUS_HINT}</p>
            <button
              onClick={cargarTareas}
              className="mt-3 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-amber-700 active:scale-95"
            >
              {MESSAGES.BUTTON_RETRY_CONNECTION}
            </button>
          </div>
        )}

        {/* Formulario de creación */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="input-new-task" className="block text-sm font-semibold text-slate-700 mb-3">
            {MESSAGES.NEW_TASK_LABEL}
          </label>
          <div className="flex gap-2">
            <input
              id="input-new-task"
              type="text"
              placeholder={MESSAGES.NEW_TASK_PLACEHOLDER}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
              disabled={!backendDisponible}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleCrear}
              disabled={!backendDisponible}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium px-6 py-2 rounded-lg transition-colors duration-200 active:scale-95"
            >
              {MESSAGES.BUTTON_ADD}
            </button>
          </div>
        </div>

        {/* Mostrar estado de error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Mostrar estado de carga */}
        {cargando ? (
          <div className="text-center py-8 text-slate-500">
            {MESSAGES.LOADING}
          </div>
        ) : tareas.length === 0 ? (
          // Lista vacía
          <div className="text-center py-8 text-slate-400">
            <p className="text-lg">{MESSAGES.EMPTY_STATE}</p>
            <p className="text-sm">{MESSAGES.EMPTY_STATE_HINT}</p>
          </div>
        ) : (
          // Lista de tareas
          <ul className="space-y-2">
            {tareas.map((tarea) => (
              <li
                key={tarea.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200"
              >
                {editId === tarea.id ? (
                  // Modo edición inline
                  <div className="flex gap-2 p-4 items-center">
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      disabled={!backendDisponible}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => guardarEdicion(tarea.id)}
                      disabled={!backendDisponible}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium px-4 py-2 rounded transition-colors duration-200 active:scale-95 text-sm"
                    >
                      {MESSAGES.BUTTON_SAVE}
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      className="bg-slate-400 hover:bg-slate-500 text-white font-medium px-4 py-2 rounded transition-colors duration-200 active:scale-95 text-sm"
                    >
                      {MESSAGES.BUTTON_CANCEL}
                    </button>
                  </div>
                ) : (
                  // Modo lectura: mostrar tarea
                  <div className="flex items-center justify-between p-4 gap-3">
                    {/* Descripción y checkbox */}
                    <div className={`flex items-center flex-1 gap-3 min-w-0 ${backendDisponible ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`} onClick={() => toggleCompletada(tarea)}>
                      <input
                        type="checkbox"
                        checked={tarea.completada}
                        onChange={() => toggleCompletada(tarea)}
                        disabled={!backendDisponible}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        aria-label={MESSAGES.CHECKBOX_ARIA(tarea.descripcion)}
                      />
                      <span
                        className={`text-base flex-1 break-words transition-colors ${
                          tarea.completada
                            ? "line-through text-slate-400"
                            : "text-slate-700"
                        }`}
                      >
                        {tarea.descripcion}
                      </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => iniciarEdicion(tarea)}
                        disabled={!backendDisponible}
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium px-3 py-2 rounded transition-colors duration-200 active:scale-95 text-sm"
                        title={MESSAGES.BUTTON_EDIT_TITLE}
                      >
                        {MESSAGES.BUTTON_EDIT}
                      </button>
                      <button
                        onClick={() => handleEliminar(tarea.id)}
                        disabled={!backendDisponible}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-medium px-3 py-2 rounded transition-colors duration-200 active:scale-95 text-sm"
                        title={MESSAGES.BUTTON_DELETE_TITLE}
                      >
                        {MESSAGES.BUTTON_DELETE}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pie de página informativo */}
      {tareas.length > 0 && (
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>{MESSAGES.TASKS_PENDING(tareas.filter(t => !t.completada).length, tareas.length)}</p>
        </div>
      )}
    </div>
  );
}