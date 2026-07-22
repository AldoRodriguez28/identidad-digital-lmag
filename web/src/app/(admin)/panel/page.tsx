'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Dash = {
  usuarios: { estudiantes: number; internos: number; comercios: number };
  topIntereses: { nombre: string; count: number }[];
};

export default function PanelPage() {
  const [d, setD] = useState<Dash | null>(null);

  useEffect(() => {
    api('/admin/dashboard').then(async (r) => { if (r.ok) setD(await r.json()); }).catch(() => {});
  }, []);

  if (!d) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Inicio</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.estudiantes}</p><p className="text-sm text-gray-500">Estudiantes</p></div>
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.internos}</p><p className="text-sm text-gray-500">Usuarios internos</p></div>
        <div className="rounded-xl border p-4"><p className="text-3xl font-bold">{d.usuarios.comercios}</p><p className="text-sm text-gray-500">Comercios</p></div>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-medium">Top intereses</h2>
      <ul className="space-y-1">
        {d.topIntereses.map((t) => (
          <li key={t.nombre} className="flex justify-between rounded border px-3 py-2 text-sm">
            <span>{t.nombre}</span><span className="text-gray-500">{t.count}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
