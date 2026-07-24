'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Event = { id: string; titulo: string; descripcion: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number };

export default function EventosPage() {
  const [items, setItems] = useState<Event[]>([]);

  useEffect(() => {
    api('/events').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Eventos</h1>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay eventos disponibles por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{e.titulo}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{e.categoria}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{e.descripcion}</p>
              <p className="mt-2 text-xs text-gray-500">
                {new Date(e.fecha).toLocaleString()} · {e.lugar}
              </p>
              <p className="mt-1 text-sm font-semibold text-green-600">+{e.puntosOtorgados} pts por asistir</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
