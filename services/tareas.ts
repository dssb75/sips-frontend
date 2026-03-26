import { CONFIG } from '@/config/environment';
import { httpClient } from '@/services/httpClient';

/**
 * Tarea: Modelo de datos para una tarea
 * 
 * Propiedades:
 * - id: Identificador único asignado por el backend (no se envía en POST)
 * - descripcion: Texto que describe la tarea (requerido, no-vacío)
 * - completada: Booleano que indica si la tarea está realizada
 * 
 * Nota: id es opcional porque en nuevas tareas no viene del cliente
 */
interface Tarea {
  id?: number;
  descripcion: string;
  completada: boolean;
}

// Configuración del cliente HTTP
const API_URL = CONFIG.api.endpoints.tasks;

/**
 * listarTareas: Obtiene la lista completa de tareas del servidor
 * 
 * @returns Promise<Tarea[]> - Array de todas las tareas
 * @throws Error si hay un problema de conexión o el servidor retorna error
 * 
 * Endpoint: GET /api/tasks
 * Status esperado: 200 OK
 * 
 * Ejemplo de respuesta:
 * [
 *   { id: 1, descripcion: "Comprar leche", completada: false },
 *   { id: 2, descripcion: "Estudiar Go", completada: true }
 * ]
 */
export const listarTareas = async (): Promise<Tarea[]> => {
  try {
    const response = await httpClient.get(API_URL);
    return response.data || [];
  } catch (error) {
    console.error('Error al listar tareas:', error);
    throw error;
  }
};

/**
 * crearTarea: Crea una nueva tarea en el servidor
 * 
 * @param tarea - Objeto Tarea sin id (generado por backend)
 * @returns Promise<Tarea> - Tarea creada con id asignado
 * @throws Error si hay problema de conexión o validación
 * 
 * Endpoint: POST /api/tasks
 * Validaciones del backend:
 * - descripcion no puede estar vacía
 * - completada se inicializa como false (aunque se envíe true)
 * 
 * Ejemplo de request:
 * { descripcion: "Nueva tarea", completada: false }
 * 
 * Ejemplo de response:
 * { id: 3, descripcion: "Nueva tarea", completada: false }
 */
export const crearTarea = async (tarea: Tarea): Promise<Tarea> => {
  try {
    const response = await httpClient.post(API_URL, tarea);
    return response.data;
  } catch (error) {
    console.error('Error al crear tarea:', error);
    throw error;
  }
};

/**
 * actualizarTarea: Actualiza una tarea existente (descripción o completitud)
 * 
 * @param tarea - Objeto Tarea completo incluyendo id
 * @returns Promise<Tarea> - Tarea actualizada
 * @throws Error si id no existe o hay problema de conexión
 * 
 * Endpoint: PUT /api/tasks/update
 * Casos de uso:
 * 1. Cambiar descripción: { id, descripcion: "nuevo texto", completada: ... }
 * 2. Marcar completada: { ...tareaAnterior, completada: !tareaAnterior.completada }
 * 
 * Ejemplo de request (editar descripción):
 * { id: 1, descripcion: "Comprar pan", completada: false }
 * 
 * Status esperado: 200 OK o 204 No Content
 */
export const actualizarTarea = async (tarea: Tarea): Promise<Tarea> => {
  try {
    const response = await httpClient.put(`${API_URL}/update`, tarea);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    throw error;
  }
};

/**
 * eliminarTarea: Elimina una tarea del servidor
 * 
 * @param id - Identificador único de la tarea a eliminar
 * @returns Promise<void> - No retorna datos
 * @throws Error si el id no existe o hay problema de conexión
 * 
 * Endpoint: DELETE /api/tasks/delete?id={id}
 * Nota: Usa query parameter en lugar de path parameter
 * 
 * Comportamiento:
 * - Eliminación permanente e inmediata
 * - No hay soft-delete en esta aplicación
 * - Si el id no existe, el backend ignora silenciosamente
 * 
 * Status esperado: 204 No Content
 */
export const eliminarTarea = async (id: number): Promise<void> => {
  try {
    await httpClient.delete(`${API_URL}/delete?id=${id}`);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};
