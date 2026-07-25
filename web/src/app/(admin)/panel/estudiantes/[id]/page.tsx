'use client';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '../../../../../lib/api';
import { PageHeader, Card, Badge, Button } from '../../_components/ui';

type Detail = {
  nombreCompleto: string; correo: string; curp: string; telefono: string; nivel: string;
  puntosAcumulados: number; colonia: string; escolaridad: string;
  interests: { id: string; nombre: string }[]; ine: { frente: boolean; reverso: boolean };
};

function IneImage({ id, side }: { id: string; side: 'frente' | 'reverso' }) {
  const urlRef = useRef<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api(`/admin/students/${id}/ine/${side}`).then(async (r) => {
      if (!r.ok) return;
      const blob = await r.blob();
      if (cancelled) return;
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
    }).catch(() => {});
    return () => { cancelled = true; if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; } };
  }, [id, side]);
  if (!url) return <div className="h-44 w-72 animate-pulse rounded-xl bg-gray-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`INE ${side}`} className="h-44 w-72 rounded-xl border border-black/10 object-contain" />;
}

function Dato({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default function DetalleEstudiantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/admin/students/${id}`).then(async (r) => {
      if (r.ok) setD(await r.json());
      else if (r.status === 404) router.push('/panel/estudiantes');
    }).catch(() => {});
  }, [id, router]);

  async function baja() {
    if (!confirm('¿Dar de baja a este estudiante? Esta acción no se puede deshacer.')) return;
    try {
      const res = await api(`/admin/students/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/panel/estudiantes');
      else setError('No se pudo dar de baja.');
    } catch { setError('No se pudo dar de baja.'); }
  }

  if (!d) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/panel/estudiantes" className="mb-3 inline-flex items-center gap-1 text-sm text-guinda hover:underline">
        <ArrowLeft size={16} /> Volver a estudiantes
      </Link>
      <PageHeader
        title={d.nombreCompleto}
        subtitle={`${d.correo} · ${d.telefono}`}
        action={<div className="flex items-center gap-2"><Badge>Nivel {d.nivel}</Badge><Badge>{d.puntosAcumulados} pts</Badge></div>}
      />

      <Card className="mb-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Dato label="CURP" value={d.curp} />
          <Dato label="Escolaridad" value={d.escolaridad} />
          <Dato label="Colonia" value={d.colonia} />
          <Dato label="Teléfono" value={d.telefono} />
          <Dato label="Nivel" value={d.nivel} />
          <Dato label="Puntos" value={d.puntosAcumulados} />
        </dl>
        {d.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4">
            {d.interests.map((i) => <span key={i.id} className="rounded-full border border-guinda/20 px-3 py-1 text-xs text-guinda">{i.nombre}</span>)}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-guinda">Identificación (INE)</h2>
        <div className="flex flex-wrap gap-4">
          {d.ine.frente ? <IneImage id={id} side="frente" /> : <p className="text-sm text-gray-400">Sin frente</p>}
          {d.ine.reverso ? <IneImage id={id} side="reverso" /> : <p className="text-sm text-gray-400">Sin reverso</p>}
        </div>
      </Card>

      <button onClick={baja}
        className="inline-flex items-center gap-2 rounded-full border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5">
        <Trash2 size={16} /> Dar de baja
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
