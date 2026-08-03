'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { GraduationCap, Ticket, Rocket, Star, Store } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';
import { NivelesTiers } from '../../../components/niveles';

type Benefit = { id: string; nombre: string; descripcion?: string; porcentajeDescuento: number; logo: string | null };
type Me = { nivel: string; puntosAcumulados: number };
type Points = { siguiente: string | null; puntosParaSiguiente: number };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function BeneficiosPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [pts, setPts] = useState<Points | null>(null);

  useEffect(() => {
    api('/benefits').then(async (r) => { if (r.ok) setBenefits(await r.json()); }).catch(() => {});
    api('/students/me/profile').then(async (r) => { if (r.ok) setMe(await r.json()); }).catch(() => {});
    api('/students/me/points').then(async (r) => { if (r.ok) setPts(await r.json()); }).catch(() => {});
  }, []);

  const features = [
    { icon: GraduationCap, title: 'Becas para cursos y certificaciones' },
    { icon: Ticket, title: 'Entrada gratuita a eventos o conciertos' },
    { icon: Rocket, title: 'Participación en programas de mentoría y emprendimiento' },
  ];
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Beneficios</h1>
          <p className="mt-1 text-sm text-gray-500">Entre más participas, más beneficios obtienes.</p>
        </header>

        {/* Hero */}
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-guinda p-6 text-white sm:p-8 lg:flex-row lg:justify-between">
          <div>
            <p className="text-sm text-white/80">Conforme aumentan tus puntos, accedes a beneficios como:</p>
            <ul className="mt-4 space-y-2">
              {features.map((f) => (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-dorado"><f.icon size={16} /></span>
                  <span className="text-sm">{f.title}</span>
                </li>
              ))}
            </ul>
          </div>
          <Image src="/brand/tarjeta-frontal.webp" alt="Tarjeta Juventud" width={320} height={200} className="w-60 rounded-xl shadow-lg" />
        </div>

        {/* Stat cards */}
        {me && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mis puntos</p>
              <p className="mt-1 flex items-center gap-1 text-2xl font-extrabold text-guinda"><Star size={18} className="text-dorado" />{me.puntosAcumulados} pts</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mi nivel actual</p>
              <p className="mt-1 text-2xl font-extrabold capitalize text-guinda">Nivel {me.nivel}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Próximo nivel</p>
              <p className="mt-1 text-sm text-gray-600">{pts?.siguiente ? `${pts.puntosParaSiguiente} pts para alcanzar el nivel ${cap(pts.siguiente)}.` : 'Has alcanzado el nivel máximo.'}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Niveles</p>
              <NivelesTiers nivel={me.nivel} />
            </div>
          </div>
        )}

        {/* Comercios */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-guinda">Beneficios en comercios</h3>
          {benefits.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay comercios afiliados.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <article key={b.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    {b.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${BASE}/benefits/${b.id}/logo`} alt={b.nombre} className="h-11 w-11 rounded-full border border-black/5 object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-guinda/10 text-guinda"><Store size={20} /></span>
                    )}
                    <span className="rounded-full bg-guinda px-3 py-1 text-sm font-bold text-white">{b.porcentajeDescuento}%</span>
                  </div>
                  <h4 className="mt-3 font-bold text-ink">{b.nombre}</h4>
                  {b.descripcion && <p className="mt-1 text-sm text-gray-600">{b.descripcion}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
