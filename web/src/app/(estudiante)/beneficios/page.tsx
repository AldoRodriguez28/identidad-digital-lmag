'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Benefit = { id: string; nombre: string; descripcion?: string; porcentajeDescuento: number; logo?: string };

export default function BeneficiosPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api('/benefits').then(async (r) => {
      if (r.ok) setBenefits(await r.json());
      else setError(true);
    }).catch(() => setError(true));
  }, []);

  if (error) return <main className="p-6">No se pudieron cargar los beneficios.</main>;

  return (
    <main className="mx-auto mt-10 max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Beneficios</h1>
      {benefits.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay comercios afiliados.</p>
      ) : (
        <ul className="space-y-3">
          {benefits.map((b) => (
            <li key={b.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{b.nombre}</span>
                <span className="rounded-full bg-black px-3 py-1 text-sm text-white">{b.porcentajeDescuento}% dcto</span>
              </div>
              {b.descripcion && <p className="mt-1 text-sm text-gray-600">{b.descripcion}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
