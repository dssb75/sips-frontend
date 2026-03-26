"use client";

import axios from "axios";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth";
import { writeSession, StoredSession } from "@/services/session";

const extractApiError = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  if (typeof error.response?.data?.error === "string" && error.response.data.error.trim()) {
    return error.response.data.error;
  }
  return fallback;
};

export default function LoginForm() {
  const router = useRouter();
  const [loginData, setLoginData] = useState({ username: "admin", password: "admin123" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login(loginData);
      const session: StoredSession = { auth: response, issuedAt: Date.now() };
      writeSession(session);
      window.dispatchEvent(new Event("sips-auth-updated"));
      router.push("/dashboard");
    } catch (err) {
      setError(extractApiError(err, "No se pudo iniciar sesion."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Usuario</label>
        <input
          type="text"
          value={loginData.username}
          onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
          placeholder="Usuario"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contrasena</label>
        <input
          type="password"
          value={loginData.password}
          onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Contrasena"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading ? "Ingresando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}
