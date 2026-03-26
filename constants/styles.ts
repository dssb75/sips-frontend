/**
 * Constantes de estilos Tailwind CSS
 * Centraliza las clases de estilo para mantener consistencia visual
 * y facilitar cambios de tema
 */

export const STYLES = {
  // Colores de fondo
  bg: {
    primary: "bg-blue-600",
    primaryHover: "bg-blue-700",
    secondary: "bg-amber-500",
    secondaryHover: "bg-amber-600",
    danger: "bg-red-600",
    dangerHover: "bg-red-700",
    success: "bg-green-600",
    successHover: "bg-green-700",
    neutral: "bg-slate-400",
    neutralHover: "bg-slate-500",
    muted: "bg-gray-100",
  },

  // Colores de texto
  text: {
    white: "text-white",
    primary: "text-slate-800",
    secondary: "text-slate-600",
    muted: "text-slate-500",
    error: "text-red-700",
  },

  // Bordes y sombras
  border: {
    default: "border border-slate-200",
    error: "border border-red-200",
    focus: "border border-blue-300",
  },

  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
    hover: "hover:shadow-md",
  },

  // Inputs
  input: {
    base: "px-4 py-2 border border-slate-300 rounded-lg transition-colors",
    focus: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    fullClass: "px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
  },

  // Botones
  button: {
    base: "font-medium px-6 py-2 rounded-lg transition-colors duration-200 active:scale-95",
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors duration-200 active:scale-95",
    secondary: "bg-amber-500 hover:bg-amber-600 text-white font-medium px-3 py-2 rounded transition-colors duration-200 active:scale-95 text-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-2 rounded transition-colors duration-200 active:scale-95 text-sm",
    success: "bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded transition-colors duration-200 active:scale-95 text-sm",
    neutral: "bg-slate-400 hover:bg-slate-500 text-white font-medium px-4 py-2 rounded transition-colors duration-200 active:scale-95 text-sm",
  },

  // Fondos de página
  background: {
    main: "bg-gradient-to-br from-slate-50 to-slate-100",
  },

  // Tarjetas
  card: {
    base: "bg-white rounded-lg shadow-md p-6",
    item: "bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200",
  },

  // Flexbox utilities
  flex: {
    centerBetween: "flex items-center justify-between",
    center: "flex items-center justify-center",
    col: "flex flex-col",
  },

  // Estado completada/tachada
  completed: "line-through text-slate-400",
  pending: "text-slate-700",
} as const;
