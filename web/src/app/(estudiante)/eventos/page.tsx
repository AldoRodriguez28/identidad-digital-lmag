'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, QrCode, Star } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';

type Event = { id: string; titulo: string; descripcion: string; categoria: string; fecha: string; lugar: string; puntosOtorgados: number };
type Me = { nivel: string; puntosAcumulados: number; credentialToken: string };

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'deportivo', label: 'Deportivos' },
  { value: 'cultural', label: 'Culturales' },
  { value: 'taller', label: 'Talleres' },
];
const CAT: Record<string, { label: string; cls: string }> = {
  deportivo: { label: 'Deportivo', cls: 'bg-success text-white' },
  cultural: { label: 'Cultural', cls: 'bg-info text-white' },
  taller: { label: 'Taller', cls: 'bg-dorado text-guinda-900' },
};

export default function EventosPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState('');

  useEffect(() => {
    api('/events').then(async (r) => { if (r.ok) setItems(await r.json()); }).catch(() => {});
    api('/students/me/profile').then(async (r) => { if (r.ok) setMe(await r.json()); }).catch(() => {});
  }, []);

  const visibles = tab ? items.filter((e) => e.categoria === tab) : items;

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Eventos</h1>
          <p className="mt-1 text-sm text-gray-500">Participa en actividades, suma puntos y crece.</p>
        </header>

        {me && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex items-center gap-4 rounded-2xl bg-guinda p-5 text-white">
              <Image src="/brand/tarjeta-frontal.webp" alt="Tarjeta" width={200} height={125} className="hidden w-32 rounded-lg sm:block" />
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">Mis puntos</p>
                <p className="text-3xl font-extrabold text-dorado">{me.puntosAcumulados} pts</p>
                <span className="mt-1 inline-block rounded-full bg-dorado px-3 py-0.5 text-xs font-bold capitalize text-guinda-900">Nivel {me.nivel}</span>
              </div>
            </div>
            <Link href={`/c/${me.credentialToken}`} className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-colors hover:border-guinda/30">
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-guinda/10 text-guinda"><QrCode size={28} /></span>
              <div>
                <p className="font-bold text-ink">Mi código QR</p>
                <p className="text-sm text-gray-500">Escanea en los eventos para registrar tu asistencia.</p>
              </div>
            </Link>
          </div>
        )}

        {/* Tabs + badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === t.value ? 'bg-guinda text-white' : 'border border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-guinda px-3 py-1.5 text-xs font-bold text-white"><Star size={13} className="text-dorado" />Gana puntos por evento</span>
        </div>

        <section>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-guinda">Próximos eventos destacados</h3>
          <p className="mb-4 text-sm text-gray-500">Asiste, participa y acumula puntos.</p>
          {visibles.length === 0 ? (
            <p className="text-sm text-gray-500">No hay eventos disponibles por ahora.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((e) => {
                const cat = CAT[e.categoria] ?? { label: e.categoria, cls: 'bg-guinda text-white' };
                const d = new Date(e.fecha);
                return (
                  <article key={e.id} className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${cat.cls}`}>{cat.label}</span>
                      <span className="text-center text-xs font-semibold text-gray-500">
                        <span className="block text-lg font-extrabold text-guinda">{d.getDate()}</span>
                        {d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="font-bold text-ink">{e.titulo}</h4>
                    <p className="mt-1 text-sm text-gray-600">{e.descripcion}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={13} />{e.lugar}</p>
                    <p className="mt-3 inline-flex w-fit rounded-full bg-dorado/15 px-3 py-1 text-sm font-bold text-dorado">+{e.puntosOtorgados} pts</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
