"use client";

import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { login, refreshToken } from "@/services/auth";
import { sendEmail } from "@/services/email";
import { clearSession, readSession, StoredSession, writeSession } from "@/services/session";

const REFRESH_SKEW_SECONDS = 60;

const DEFAULT_HTML = `<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937;">
    <h2>Notificacion desde SIPS</h2>
    <p>Este correo se envio en formato <strong>HTML</strong>.</p>
  </body>
</html>`;

const extractApiError = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (typeof error.response?.data?.error === "string" && error.response.data.error.trim()) {
    return error.response.data.error;
  }

  return fallback;
};

const emitAuthUpdated = () => {
  window.dispatchEvent(new Event("sips-auth-updated"));
};

const emitAuthRefreshing = () => {
  window.dispatchEvent(new Event("sips-auth-refreshing"));
};

const emitAuthExpired = () => {
  window.dispatchEvent(new Event("sips-auth-expired"));
};

export default function AuthEmailPanel() {
  const [loginData, setLoginData] = useState({ username: "admin", password: "admin123" });
  const [session, setSession] = useState<StoredSession | null>(null);

  const [emailData, setEmailData] = useState({
    from: "",
    to: "",
    subject: "Prueba de correo HTML",
    body: DEFAULT_HTML,
  });

  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSendLoading, setIsSendLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = readSession();
    if (savedSession) {
      setSession(savedSession);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      clearSession();
      return;
    }

    writeSession(session);
  }, [session]);

  useEffect(() => {
    if (!session?.auth?.refresh_token) {
      return;
    }

    const now = Date.now();
    const expiryAt = session.issuedAt + session.auth.expires_in * 1000;
    const refreshAt = expiryAt - REFRESH_SKEW_SECONDS * 1000;
    const msUntilRefresh = Math.max(refreshAt - now, 5000);

    const timeoutId = window.setTimeout(async () => {
      try {
        emitAuthRefreshing();
        const refreshed = await refreshToken({ refresh_token: session.auth.refresh_token });
        const nextSession: StoredSession = { auth: refreshed, issuedAt: Date.now() };
        writeSession(nextSession);
        setSession(nextSession);
        emitAuthUpdated();
        setAuthError(null);
      } catch {
        clearSession();
        setSession(null);
        emitAuthExpired();
        emitAuthUpdated();
        setAuthError("La sesion expiro. Inicia sesion nuevamente.");
      }
    }, msUntilRefresh);

    return () => window.clearTimeout(timeoutId);
  }, [session]);

  const tokenPreview = useMemo(() => {
    if (!session?.auth?.access_token) {
      return "";
    }

    if (session.auth.access_token.length <= 36) {
      return session.auth.access_token;
    }

    return `${session.auth.access_token.slice(0, 18)}...${session.auth.access_token.slice(-12)}`;
  }, [session?.auth?.access_token]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const response = await login(loginData);
      const nextSession: StoredSession = { auth: response, issuedAt: Date.now() };
      writeSession(nextSession);
      setSession(nextSession);
      emitAuthUpdated();
      setSendSuccess(null);
    } catch (error) {
      clearSession();
      setSession(null);
      emitAuthUpdated();
      setAuthError(extractApiError(error, "No se pudo iniciar sesion."));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session?.auth?.access_token) {
      setSendError("Debes iniciar sesion para enviar correos.");
      return;
    }

    setIsSendLoading(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const response = await sendEmail(
        {
          from: emailData.from.trim(),
          to: emailData.to.trim(),
          subject: emailData.subject.trim(),
          body: emailData.body,
        },
        session.auth.access_token,
      );

      setSendSuccess(response.message || "Correo enviado correctamente.");
    } catch (error) {
      setSendError(extractApiError(error, "No se pudo enviar el correo."));
    } finally {
      setIsSendLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    emitAuthUpdated();
    setAuthError(null);
    setSendError(null);
    setSendSuccess(null);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Autenticacion y Correo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inicia sesion para obtener token Bearer y envia correos HTML por la API.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleLogin} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-700">1. Login</h3>
          <input
            type="text"
            value={loginData.username}
            onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="Usuario"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Contrasena"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isAuthLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAuthLoading ? "Ingresando..." : "Iniciar sesion"}
          </button>

          {authError && <p className="text-sm text-red-600">{authError}</p>}

          {session && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="font-semibold">Sesion activa</p>
              <p>token_type: {session.auth.token_type}</p>
              <p>expires_in: {session.auth.expires_in}s</p>
              <p className="break-all">access_token: {tokenPreview}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-800"
              >
                Cerrar sesion
              </button>
            </div>
          )}
        </form>

        <form onSubmit={handleSendEmail} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-base font-semibold text-slate-700">2. Envio de correo HTML</h3>

          <input
            type="email"
            value={emailData.from}
            onChange={(e) => setEmailData((prev) => ({ ...prev, from: e.target.value }))}
            placeholder="From (ej: tu-correo@gmail.com)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <input
            type="email"
            value={emailData.to}
            onChange={(e) => setEmailData((prev) => ({ ...prev, to: e.target.value }))}
            placeholder="To"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder="Subject"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <textarea
            value={emailData.body}
            onChange={(e) => setEmailData((prev) => ({ ...prev, body: e.target.value }))}
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isSendLoading || !session?.auth?.access_token}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSendLoading ? "Enviando..." : "Enviar correo"}
          </button>

          {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          {sendSuccess && <p className="text-sm text-emerald-700">{sendSuccess}</p>}
        </form>
      </div>
    </section>
  );
}
