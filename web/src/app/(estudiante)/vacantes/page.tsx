'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string };

export default function VacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api('/jobs').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  const term = q.trim().toLowerCase();
  const visibles = term
    ? items.filter((j) => j.puesto.toLowerCase().includes(term) || j.empresa.toLowerCase().includes(term))
    : items;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Bolsa de trabajo</h1>
      <input className="mb-4 w-full rounded border p-2 text-sm" placeholder="Buscar por puesto o empresa"
        value={q} onChange={(e) => setQ(e.target.value)} />
      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay vacantes disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((j) => (
            <li key={j.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{j.puesto}</h2>
                <span className="text-sm text-gray-600">{j.empresa}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{j.requisitos}</p>
              <p className="mt-2 text-sm">Contacto: <span className="font-medium">{j.contacto}</span></p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
