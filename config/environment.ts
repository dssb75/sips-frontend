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
      authLogin: "/api/auth/login",
      authRefresh: "/api/auth/refresh",
      emailSend: "/api/email/send",
      calendarVigencia: "/api/calendar/vigencia",
      calendarYear: "/api/calendar/year",
      calendarSelection: "/api/calendar/selection",
      calendarPreview: "/api/calendar/preview",
      solicitudesCreate: "/api/solicitudes/create",
      solicitudesList: "/api/solicitudes/list",
      solicitudesPending: "/api/solicitudes/pending",
      solicitudesRadicar: "/api/solicitudes/radicar",
      solicitudesDelete: "/api/solicitudes/delete",
      solicitudesEditor: "/api/solicitudes/editor",
      solicitudesPermisosToggle: "/api/solicitudes/permisos/toggle",
      solicitudesPermisosBulk: "/api/solicitudes/permisos/bulk",
      sindicalizados: "/api/sindicalizados",
      sindicalizadosAsignar: "/api/sindicalizados/asignar",
      sindicatos: "/api/sindicatos",
      composiciones: "/api/composiciones",
      busdatosConsultaDocumento: "/api/busdatos/consulta-documento",
      solicitudesMine: "/api/solicitudes/mis",
    },

    // Timeouts
    timeout: 20000, // 20 segundos
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
