"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operador" },
  { value: "viewer", label: "Solo lectura" },
  { value: "uploader", label: "Capturista (solo altas)" }
];

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "operator" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo registrar");
      return;
    }
    router.push("/login");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400">Registro</p>
          <h1 className="text-2xl font-semibold">Crea tu cuenta</h1>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200">Contrasena</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-200">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-amber-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-teal-700 transition text-white font-semibold rounded-md py-2 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
        <div className="text-sm text-slate-300 text-center">
          <span>Ya tienes cuenta? </span>
          <Link href="/login" className="text-amber-300 hover:text-amber-200">
            Inicia sesion
          </Link>
        </div>
      </div>
    </main>
  );
}
