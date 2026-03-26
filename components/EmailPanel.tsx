"use client";

import axios from "axios";
import { FormEvent, useState } from "react";
import { sendEmail } from "@/services/email";
import { getAccessToken } from "@/services/session";

const DEFAULT_HTML = `<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937;">
    <h2>Notificacion desde SIPS</h2>
    <p>Este correo se envio en formato <strong>HTML</strong>.</p>
  </body>
</html>`;

const extractApiError = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  if (typeof error.response?.data?.error === "string" && error.response.data.error.trim()) {
    return error.response.data.error;
  }
  return fallback;
};

export default function EmailPanel() {
  const [emailData, setEmailData] = useState({
    from: "",
    to: "",
    subject: "Prueba de correo HTML",
    body: DEFAULT_HTML,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setError("No hay sesion activa.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await sendEmail(
        {
          from: emailData.from.trim(),
          to: emailData.to.trim(),
          subject: emailData.subject.trim(),
          body: emailData.body,
        },
        token,
      );
      setSuccess(response.message || "Correo enviado correctamente.");
    } catch (err) {
      setError(extractApiError(err, "No se pudo enviar el correo."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Envio de correo HTML</h2>
        <p className="mt-1 text-sm text-slate-500">Envia un correo en formato HTML a traves de la API.</p>
      </div>

      <form onSubmit={handleSend} className="max-w-xl space-y-3">
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
          disabled={isLoading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Enviando..." : "Enviar correo"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-700">{success}</p>}
      </form>
    </section>
  );
}
