/**
 * Constantes de mensajes de la aplicación
 * Centraliza todos los strings del UI para fácil mantenimiento y multiidioma
 */

export const MESSAGES = {
  // Títulos y etiquetas
  APP_TITLE: "SIPS",
  APP_SUBTITLE: "Sistema de información de permisos sindicales",
  NEW_TASK_LABEL: "Nueva tarea",
  NEW_TASK_PLACEHOLDER: "Describe tu tarea aquí...",

  // Botones
  BUTTON_ADD: "Agregar",
  BUTTON_SAVE: "Guardar",
  BUTTON_CANCEL: "Cancelar",
  BUTTON_EDIT: "Editar",
  BUTTON_DELETE: "Eliminar",

  // Errores
  ERROR_EMPTY_DESCRIPTION: "La descripción no puede estar vacía",
  ERROR_CREATE_FAIL: "Error al crear la tarea",
  ERROR_UPDATE_FAIL: "Error al actualizar la tarea",
  ERROR_DELETE_FAIL: "Error al eliminar la tarea",
  ERROR_LOAD_FAIL: "No se pudieron cargar las tareas",
  ERROR_SAVE_FAIL: "Error al guardar los cambios",
  ERROR_BACKEND_UNAVAILABLE: "No se pudo establecer conexión con el backend. Verifica que el servidor esté corriendo.",
  ERROR_BACKEND_TIMEOUT: "El backend tardó demasiado en responder. Intenta nuevamente en unos segundos.",
  ERROR_BACKEND_SERVER: "El backend respondió con un error interno. Revisa el servicio y vuelve a intentar.",

  // Estado de conexión
  BACKEND_STATUS_TITLE: "Backend no disponible",
  BUTTON_RETRY_CONNECTION: "Reintentar conexión",
  BACKEND_STATUS_HINT: "Mientras no haya conexión, las operaciones de tareas quedan deshabilitadas.",

  // Estados
  LOADING: "Cargando tareas...",
  EMPTY_STATE: "No hay tareas aún",
  EMPTY_STATE_HINT: "Crea una nueva tarea para comenzar",

  // Aria labels y accesibilidad
  CHECKBOX_ARIA: (description: string) => `Marcar "${description}" como completada`,
  BUTTON_EDIT_TITLE: "Editar descripción",
  BUTTON_DELETE_TITLE: "Eliminar tarea",

  // Status
  TASKS_PENDING: (pending: number, total: number) =>
    `${pending} de ${total} tareas pendientes`,
} as const;
