"use client";

import { useEffect, useMemo, useState } from "react";
import { readSession } from "@/services/session";

type SessionStatus = "inactive" | "active" | "refreshing" | "expired";

const statusStyles: Record<SessionStatus, string> = {
  inactive: "border-slate-300 bg-slate-100 text-slate-700",
  active: "border-emerald-300 bg-emerald-100 text-emerald-800",
  refreshing: "border-amber-300 bg-amber-100 text-amber-800",
  expired: "border-rose-300 bg-rose-100 text-rose-800",
};

const statusText: Record<SessionStatus, string> = {
  inactive: "Sesion: no iniciada",
  active: "Sesion: activa",
  refreshing: "Sesion: renovando token...",
  expired: "Sesion: expirada",
};

const getInitialStatus = (): SessionStatus => {
  const session = readSession();
  return session?.auth?.access_token ? "active" : "inactive";
};

export default function SessionStatusIndicator() {
  const [status, setStatus] = useState<SessionStatus>("inactive");
  const [showExpiredToast, setShowExpiredToast] = useState(false);

  useEffect(() => {
    setStatus(getInitialStatus());

    const handleAuthUpdated = () => {
      setStatus(getInitialStatus());
    };

    const handleRefreshing = () => {
      setStatus("refreshing");
    };

    const handleExpired = () => {
      setStatus("expired");
      setShowExpiredToast(true);

      window.setTimeout(() => {
        setShowExpiredToast(false);
      }, 4500);
    };

    window.addEventListener("sips-auth-updated", handleAuthUpdated);
    window.addEventListener("sips-auth-refreshing", handleRefreshing);
    window.addEventListener("sips-auth-expired", handleExpired);

    return () => {
      window.removeEventListener("sips-auth-updated", handleAuthUpdated);
      window.removeEventListener("sips-auth-refreshing", handleRefreshing);
      window.removeEventListener("sips-auth-expired", handleExpired);
    };
  }, []);

  const badgeClass = useMemo(() => {
    return `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`;
  }, [status]);

  return (
    <>
      <span className={badgeClass}>{statusText[status]}</span>

      {showExpiredToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-lg">
          <p className="font-semibold">Sesion expirada</p>
          <p className="mt-1 text-xs">Tu token vencio. Inicia sesion nuevamente para continuar.</p>
        </div>
      )}
    </>
  );
}
