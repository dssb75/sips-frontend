/**
 * Configuración centralizada de la aplicación
 * Mantiene variables de ambiente y constantes de configuración
 */

export const CONFIG = {
  // API Configuration
  api: {
    // Base URL para llamadas API en desarrollo
    // En producción, esto debería ser una variable de ambiente
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
    
    // Endpoints específicos
    endpoints: {
      tasks: "/api/tasks",
      taskUpdate: "/api/tasks/update",
      taskDelete: "/api/tasks/delete",
    },

    // Timeouts
    timeout: 5000, // 5 segundos
  },

  // Application Mode
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",

  // Logging
  logging: {
    enableConsole: true,
    enableErrorReporting: process.env.NODE_ENV !== "development",
  },

  // UI Configuration
  ui: {
    // Número de items por página (para paginación futura)
    itemsPerPage: 10,
    
    // Duración de animaciones en ms
    animationDuration: 200,
    
    // Duración máxima de un toast/notificación
    toastDuration: 3000,
  },
} as const;
