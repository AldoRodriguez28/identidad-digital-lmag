'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award, Lock, GraduationCap, MapPin, Pencil, Plus, CalendarDays,
  Share2, AtSign, Music2, MessageCircle, Check, X,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';
import { TarjetaFlip } from '../../../components/TarjetaFlip';

type Interest = { id: string; nombre: string };
type Profile = {
  nombreCompleto: string; correo: string; nivel: string; puntosAcumulados: number; credentialToken: string;
  edad: number; escolaridad: string; colonia: string; telefono: string;
  facebook: string | null; instagram: string | null; tiktok: string | null; whatsapp: string | null;
  interests: Interest[]; siguiente: string | null; puntosParaSiguiente: number; porcentaje: number;
};

const inputCls = 'w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-guinda">{title}</h3>
      {children}
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [editing, setEditing] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  function hydrate(pr: Profile) { setP(pr); setTelefono(pr.telefono); setSelected(pr.interests.map((i) => i.id)); }

  useEffect(() => {
    api('/students/me/profile').then(async (r) => {
      if (!r.ok) { router.push('/ingresar'); return; }
      hydrate(await r.json());
    }).catch(() => router.push('/ingresar'));
    api('/interests').then(async (r) => { if (r.ok) setAllInterests(await r.json()); }).catch(() => {});
  }, [router]);

  function toggle(id: string) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await api('/students/me/profile', { method: 'PATCH', body: JSON.stringify({ telefono, interestIds: selected }) });
      if (res.ok) { hydrate(await res.json()); setEditing(false); setMsg('Perfil actualizado.'); }
      else setMsg('No se pudo guardar.');
    } catch { setMsg('Error de red.'); } finally { setSaving(false); }
  }
  function cancel() { if (p) hydrate(p); setEditing(false); setMsg(''); }

  if (!p) return <StudentShell><p className="text-sm text-gray-500">Cargando…</p></StudentShell>;

  const redes: { key: keyof Profile; label: string; value: string | null; icon: React.ElementType }[] = [
    { key: 'facebook', label: 'Facebook', value: p.facebook, icon: Share2 },
    { key: 'instagram', label: 'Instagram', value: p.instagram, icon: AtSign },
    { key: 'tiktok', label: 'TikTok', value: p.tiktok, icon: Music2 },
    { key: 'whatsapp', label: 'WhatsApp', value: p.whatsapp, icon: MessageCircle },
  ];

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Hero */}
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold uppercase leading-none tracking-tight">
              <span className="text-guinda">Identidad Digital</span><br />
              <span className="text-dorado">del Joven</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">Tu identidad. Tus beneficios. Tus oportunidades.</p>
            <div className="mt-2 h-1 w-24 rounded-full bg-dorado" />
          </div>
          <Image src="/brand/tarjeta-frontal.webp" alt="Tarjeta Juventud" width={420} height={260} priority className="w-72 rounded-xl shadow-lg lg:w-80" />
        </div>

        {/* Barra de nivel */}
        <div className="flex flex-col gap-4 rounded-2xl bg-guinda p-5 text-white sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15"><Award size={20} className="text-dorado" /></span>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/70">Nivel</p>
              <p className="text-lg font-bold capitalize text-dorado">{p.nivel}</p>
            </div>
          </div>
          <div className="sm:border-l sm:border-white/15 sm:pl-6">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Puntos acumulados</p>
            <p className="text-lg font-bold text-dorado">{p.puntosAcumulados} pts</p>
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-white/70">
              {p.siguiente ? `Siguiente nivel — ${p.puntosParaSiguiente} pts` : 'Nivel máximo'}
            </p>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-dorado" style={{ width: `${p.porcentaje}%` }} /></div>
          </div>
        </div>

        {/* Card de perfil */}
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-guinda text-2xl font-bold text-white ring-4 ring-dorado">
              {p.nombreCompleto.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-guinda ring-1 ring-black/5"><Lock size={12} /></span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-ink">{p.nombreCompleto}</h2>
              <p className="truncate text-sm text-gray-400">@{p.credentialToken}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center gap-1"><CalendarDays size={14} className="text-guinda" />{p.edad} años</span>
                <span className="flex items-center gap-1"><GraduationCap size={14} className="text-guinda" />{p.escolaridad}</span>
                <span className="flex items-center gap-1"><MapPin size={14} className="text-guinda" />{p.colonia}</span>
              </div>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-full border border-guinda/25 px-4 py-2 text-sm font-semibold text-guinda hover:bg-guinda/5">
                <Pencil size={15} />Editar perfil
              </button>
            )}
          </div>

          {editing && (
            <div className="mt-5 border-t border-black/5 pt-4">
              <label className="mb-1 block text-sm font-semibold text-ink">Teléfono</label>
              <input className={inputCls} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              <div className="mt-4 flex gap-2">
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-semibold text-white hover:bg-guinda-700 disabled:opacity-50"><Check size={15} />{saving ? 'Guardando…' : 'Guardar'}</button>
                <button onClick={cancel} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-black/5"><X size={15} />Cancelar</button>
              </div>
            </div>
          )}
          {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
        </div>

        {/* 4 tarjetas */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="Mis intereses">
            <div className="flex flex-wrap gap-2">
              {(editing ? allInterests : p.interests).map((i) => {
                const on = selected.includes(i.id);
                return editing ? (
                  <button key={i.id} onClick={() => toggle(i.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'border-guinda bg-guinda text-white' : 'border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
                    {i.nombre}
                  </button>
                ) : (
                  <span key={i.id} className="inline-flex items-center gap-1 rounded-full border border-guinda/20 px-3 py-1 text-xs text-guinda"><span className="text-guinda">♥</span>{i.nombre}</span>
                );
              })}
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-1 rounded-full border border-guinda/25 px-3 py-1 text-xs font-semibold text-guinda hover:bg-guinda/5"><Plus size={13} />Agregar</button>
            )}
          </Card>

          <Card title="Mis logros">
            <p className="text-sm text-gray-500">Participa en eventos y beneficios para desbloquear tus primeros logros.</p>
          </Card>

          <Card title="Mi tarjeta juventud">
            <TarjetaFlip token={p.credentialToken} />
          </Card>

          <Card title="Próximo evento">
            <p className="text-sm text-gray-500">No tienes eventos próximos todavía.</p>
            <Link href="/eventos" className="mt-3 inline-flex items-center gap-1 rounded-full border border-guinda/25 px-3 py-1.5 text-xs font-semibold text-guinda hover:bg-guinda/5"><CalendarDays size={14} />Ver eventos</Link>
          </Card>
        </div>

        {/* Redes */}
        <Card title="Mis redes">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {redes.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-black/5 bg-page px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-guinda text-white"><Icon size={16} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="truncate text-xs text-gray-500">{value || 'No agregado'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}
