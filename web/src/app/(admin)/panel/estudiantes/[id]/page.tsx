'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';

type Detail = {
  nombreCompleto: string; correo: string; curp: string; telefono: string; nivel: string;
  puntosAcumulados: number; colonia: string; escolaridad: string;
  interests: { id: string; nombre: string }[]; ine: { frente: boolean; reverso: boolean };
};

function IneImage({ id, side }: { id: string; side: 'frente' | 'reverso' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    api(`/admin/students/${id}/ine/${side}`).then(async (r) => {
      if (!r.ok) return;
      const blob = await r.blob();
      if (!revoked) setUrl(URL.createObjectURL(blob));
    }).catch(() => {});
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, side]);
  if (!url) return <div className="h-40 w-64 animate-pulse rounded bg-gray-100" />;
  return <img src={url} alt={`INE ${side}`} className="h-40 w-64 rounded border object-contain" />;
}

export default function DetalleEstudiantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    api(`/admin/students/${id}`).then(async (r) => {
      if (r.ok) setD(await r.json());
      else if (r.status === 404) router.push('/panel/estudiantes');
    }).catch(() => {});
  }, [id, router]);

  async function baja() {
    if (!confirm('¿Dar de baja a este estudiante? Esta acción no se puede deshacer.')) return;
    const res = await api(`/admin/students/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/panel/estudiantes');
  }

  if (!d) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{d.nombreCompleto}</h1>
        <p className="text-sm text-gray-600">{d.correo} · {d.telefono}</p>
        <p className="mt-1 text-sm">Nivel <b>{d.nivel}</b> · {d.puntosAcumulados} pts · {d.escolaridad} · {d.colonia}</p>
        <p className="text-sm text-gray-500">CURP: {d.curp}</p>
      </div>
      {d.interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.interests.map((i) => <span key={i.id} className="rounded-full border px-3 py-1 text-xs">{i.nombre}</span>)}
        </div>
      )}
      <div>
        <h2 className="mb-2 text-sm font-medium">INE</h2>
        <div className="flex flex-wrap gap-4">
          {d.ine.frente ? <IneImage id={id} side="frente" /> : <p className="text-sm text-gray-400">Sin frente</p>}
          {d.ine.reverso ? <IneImage id={id} side="reverso" /> : <p className="text-sm text-gray-400">Sin reverso</p>}
        </div>
      </div>
      <button className="rounded bg-red-600 px-4 py-2 text-sm text-white" onClick={baja}>Dar de baja</button>
    </main>
  );
}
