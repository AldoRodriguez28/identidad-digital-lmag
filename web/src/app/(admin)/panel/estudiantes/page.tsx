'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../../lib/api';

type Row = { id: string; nombreCompleto: string; correo: string; nivel: string; puntosAcumulados: number };
type Resp = { items: Row[]; total: number; page: number; pageSize: number };

export default function EstudiantesPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    api(`/admin/students?page=${page}&pageSize=${pageSize}`).then(async (r) => {
      if (r.ok) setData(await r.json());
    }).catch(() => {});
  }, [page]);

  if (!data) return <main className="p-6">Cargando…</main>;
  const pages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Estudiantes ({data.total})</h1>
      <ul className="divide-y rounded-xl border">
        {data.items.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <Link href={`/panel/estudiantes/${s.id}`} className="font-medium hover:underline">{s.nombreCompleto}</Link>
            <span className="text-gray-500">{s.correo} · {s.nivel} · {s.puntosAcumulados} pts</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3 text-sm">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </main>
  );
}
