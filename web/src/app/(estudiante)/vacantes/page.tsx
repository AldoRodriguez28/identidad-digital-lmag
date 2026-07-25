'use client';
import { useEffect, useState } from 'react';
import { Search, Building2, Mail } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';

type Job = { id: string; puesto: string; empresa: string; requisitos: string; contacto: string };

export default function VacantesPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { api('/jobs').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {}); }, []);

  const term = q.trim().toLowerCase();
  const visibles = term ? items.filter((j) => j.puesto.toLowerCase().includes(term) || j.empresa.toLowerCase().includes(term)) : items;

  return (
    <StudentShell>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Bolsa de Trabajo</h1>
        <p className="mt-1 text-sm text-gray-500">Vacantes para jóvenes de San Andrés Tuxtla.</p>
      </header>

      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15"
          placeholder="Buscar por puesto o empresa" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay vacantes disponibles por ahora.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibles.map((j) => (
            <article key={j.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-ink">{j.puesto}</h2>
                <span className="flex items-center gap-1 text-sm text-gray-600"><Building2 size={14} />{j.empresa}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{j.requisitos}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-guinda"><Mail size={14} /><span className="font-medium">{j.contacto}</span></p>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
