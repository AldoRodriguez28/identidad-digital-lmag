'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

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

  useEffect(() => {
    api('/workshops').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  const visibles = modalidad ? items.filter((w) => w.modalidad === modalidad) : items;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cursos y talleres</h1>
        <select className="rounded border p-2 text-sm" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
          {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {visibles.length === 0 ? (
        <p className="text-sm text-gray-500">No hay talleres disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((w) => (
            <li key={w.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{w.titulo}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{w.modalidad}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{w.descripcion}</p>
              <p className="mt-2 text-xs text-gray-500">{w.horario}</p>
              <p className="mt-1 text-sm font-semibold text-green-600">
                {w.precio === 0 ? 'Gratis' : `$${w.precio}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
