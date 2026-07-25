'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';

type Workshop = { id: string; titulo: string; descripcion: string; precio: number; horario: string; modalidad: string };
const MODALIDADES = [
  { value: '', label: 'Todas' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hibrido', label: 'Híbrido' },
];

export default function TalleresPage() {
  const [items, setItems] = useState<Workshop[]>([]);
  const [modalidad, setModalidad] = useState('');
  useEffect(() => { api('/workshops').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {}); }, []);
  const visibles = modalidad ? items.filter((w) => w.modalidad === modalidad) : items;

  return (
    <StudentShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Cursos y Talleres</h1>
          <p className="mt-1 text-sm text-gray-500">Fórmate con talleres presenciales, virtuales o híbridos.</p>
        </div>
        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15"
          value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
          {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </header>

      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay talleres disponibles por ahora.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((w) => (
            <article key={w.id} className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-bold text-ink">{w.titulo}</h2>
                <span className="shrink-0 rounded-full bg-guinda/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-guinda">{w.modalidad}</span>
              </div>
              <p className="text-sm text-gray-600">{w.descripcion}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500"><Clock size={13} />{w.horario}</p>
              <p className="mt-3 inline-flex w-fit rounded-full bg-dorado/15 px-3 py-1 text-sm font-bold text-dorado">
                {w.precio === 0 ? 'Gratis' : `$${w.precio}`}
              </p>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
