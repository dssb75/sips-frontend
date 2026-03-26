"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SessionStatusIndicator from "@/components/SessionStatusIndicator";
import { clearSession, readSession, writeSession, StoredSession } from "@/services/session";
import { refreshToken } from "@/services/auth";

const REFRESH_SKEW_SECONDS = 60;

const BACKEND_DOWN_KEY = "sips-backend-down-msg";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scheduleRefresh = (session: StoredSession) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!session?.auth?.refresh_token) return;

    const now = Date.now();
    const expiryAt = session.issuedAt + session.auth.expires_in * 1000;
    const refreshAt = expiryAt - REFRESH_SKEW_SECONDS * 1000;
    const msUntilRefresh = Math.max(refreshAt - now, 5000);

    timerRef.current = setTimeout(async () => {
      try {
        window.dispatchEvent(new Event("sips-auth-refreshing"));
        const refreshed = await refreshToken({ refresh_token: session.auth.refresh_token });
        const nextSession: StoredSession = { auth: refreshed, issuedAt: Date.now() };
        writeSession(nextSession);
        window.dispatchEvent(new Event("sips-auth-updated"));
        scheduleRefresh(nextSession);
      } catch {
        clearSession();
        window.dispatchEvent(new Event("sips-auth-expired"));
        window.dispatchEvent(new Event("sips-auth-updated"));
        router.push("/login");
      }
    }, msUntilRefresh);
  };

  useEffect(() => {
    const session = readSession();
    if (!session?.auth?.access_token) {
      router.push("/login");
      return;
    }

    scheduleRefresh(session);
    setReady(true);

    const handleExpired = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      router.push("/login");
    };

    const handleBackendDown = (e: Event) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      const msg = (e as CustomEvent<{ message: string }>).detail?.message ?? "Error de conexion con el servidor";
      sessionStorage.setItem(BACKEND_DOWN_KEY, msg);
      setBackendError(msg);
      setCountdown(4);
      let secs = 4;
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(countdownRef.current!);
          clearSession();
          window.dispatchEvent(new Event("sips-auth-updated"));
          router.push("/login");
        }
      }, 1000);
    };

    window.addEventListener("sips-auth-expired", handleExpired);
    window.addEventListener("sips-backend-down", handleBackendDown);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      window.removeEventListener("sips-auth-expired", handleExpired);
      window.removeEventListener("sips-backend-down", handleBackendDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {backendError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold text-red-700">Inconvenientes tecnicos</h2>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              No fue posible conectar con el servidor. La sesion se cerrara automaticamente.
            </p>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              <p className="break-all font-mono text-xs text-red-600">{backendError}</p>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              Redirigiendo al login en <span className="font-semibold text-slate-600">{countdown}s</span>...
            </p>
          </div>
        </div>
      )}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-6 py-3">
          <SessionStatusIndicator />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
