import axios from "axios";
import { CONFIG } from "@/config/environment";
import { getAccessToken } from "@/services/session";

export const httpClient = axios.create({
  timeout: CONFIG.api.timeout,
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (!token) {
    return config;
  }

  const currentAuthHeader = config.headers?.Authorization;
  if (!currentAuthHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const isBackendDown = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  // Sin respuesta: timeout o backend caído directamente
  if (!error.response) return true;
  // 502/503/504: el proxy de Next.js no pudo alcanzar el backend
  const status = error.response.status;
  if (status === 502 || status === 503 || status === 504) return true;
  // 500 cuyo cuerpo viene del proxy de Next.js (no del backend propio)
  if (status === 500) {
    const contentType = error.response.headers?.["content-type"] ?? "";
    const hasJsonBody =
      typeof error.response.data === "object" && error.response.data !== null;
    // Si el 500 trae JSON estructurado es del backend; si no, es del proxy
    if (!hasJsonBody || contentType.includes("text/html")) return true;
  }
  return false;
};

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isBackendDown(error) && typeof window !== "undefined") {
      const message =
        axios.isAxiosError(error) && error.message ? error.message : "Error de conexion con el servidor";
      window.dispatchEvent(new CustomEvent("sips-backend-down", { detail: { message } }));
    }
    return Promise.reject(error);
  },
);
