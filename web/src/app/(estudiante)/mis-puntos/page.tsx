'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Mov = { id: string; tipo: string; referencia: string | null; puntos: number; createdAt: string };
type Summary = {
  puntosAcumulados: number; nivel: string; siguiente: string | null;
  puntosParaSiguiente: number; porcentaje: number; eventosAsistidos: number; movimientos: Mov[];
};

export default function MisPuntosPage() {
  const router = useRouter();
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api('/students/me/points').then(async (r) => {
      if (r.ok) setS(await r.json());
      else router.push('/ingresar');
    }).catch(() => router.push('/ingresar'));
  }, [router]);

  if (!s) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mis puntos</h1>
        <p className="mt-1 text-3xl font-bold">{s.puntosAcumulados} pts</p>
        <p className="text-sm capitalize text-gray-600">Nivel: <b>{s.nivel}</b></p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span className="capitalize">{s.nivel}</span>
          <span className="capitalize">{s.siguiente ?? 'máximo'}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-black" style={{ width: `${s.porcentaje}%` }} />
        </div>
        {s.siguiente && (
          <p className="mt-1 text-xs text-gray-500">Te faltan {s.puntosParaSiguiente} pts para {s.siguiente}.</p>
        )}
      </div>

      <p className="text-sm text-gray-600">Eventos asistidos: <b>{s.eventosAsistidos}</b></p>

      <div>
        <h2 className="mb-2 text-sm font-medium">Historial</h2>
        {s.movimientos.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes movimientos.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {s.movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="capitalize">{m.tipo}</span>
                <span className="font-semibold text-green-600">+{m.puntos}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
