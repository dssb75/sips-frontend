"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/components/LoginForm";

const BACKEND_DOWN_KEY = "sips-backend-down-msg";

export default function LoginPage() {
  const [backendMsg, setBackendMsg] = useState<string | null>(null);

  useEffect(() => {
    const msg = sessionStorage.getItem(BACKEND_DOWN_KEY);
    if (msg) {
      setBackendMsg(msg);
      sessionStorage.removeItem(BACKEND_DOWN_KEY);
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-sm space-y-4">
        {backendMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-1 text-sm font-semibold text-red-700">⚠ Inconvenientes tecnicos</p>
            <p className="text-xs text-red-600">La sesion fue cerrada porque el servidor no estuvo disponible.</p>
            <p className="mt-2 break-all font-mono text-xs text-red-400">{backendMsg}</p>
          </div>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800">SIPS</h1>
            <p className="mt-1 text-sm text-slate-500">Inicia sesion para continuar</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
