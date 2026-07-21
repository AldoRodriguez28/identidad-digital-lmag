'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Interest = { id: string; nombre: string };
type Profile = {
  nombreCompleto: string; correo: string; nivel: string; puntosAcumulados: number;
  telefono: string; interests: Interest[];
};

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [telefono, setTelefono] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/students/me/profile').then(async (r) => {
      if (!r.ok) { router.push('/ingresar'); return; }
      const p: Profile = await r.json();
      setProfile(p); setTelefono(p.telefono);
      setSelected(p.interests.map((i) => i.id));
    }).catch(() => router.push('/ingresar'));
    api('/interests').then(async (r) => { if (r.ok) setAllInterests(await r.json()); }).catch(() => {});
  }, [router]);

  function toggle(id: string) {
    setSaved(false);
    setSaveError('');
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  async function save() {
    if (saving) return;
    setSaved(false);
    setSaveError('');
    setSaving(true);
    try {
      const res = await api('/students/me/profile', {
        method: 'PATCH', body: JSON.stringify({ telefono, interestIds: selected }),
      });
      if (res.ok) { setProfile(await res.json()); setSaved(true); }
      else { setSaveError('Error al guardar. Inténtalo de nuevo.'); }
    } catch {
      setSaveError('Error de red. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  }
  async function logout() {
    await api('/students/logout', { method: 'POST' });
    router.push('/ingresar');
  }

  if (!profile) return <main className="p-6">Cargando…</main>;
  return (
    <main className="mx-auto mt-10 max-w-lg p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{profile.nombreCompleto}</h1>
        <p className="text-sm text-gray-600">{profile.correo}</p>
        <p className="mt-1">Nivel: <b>{profile.nivel}</b> · Puntos: <b>{profile.puntosAcumulados}</b></p>
      </div>
      <div>
        <label className="text-sm font-medium">Teléfono</label>
        <input className="mt-1 w-full rounded border p-2" value={telefono}
          onChange={(e) => { setSaved(false); setSaveError(''); setTelefono(e.target.value); }} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Intereses</p>
        <div className="flex flex-wrap gap-2">
          {allInterests.map((i) => (
            <button type="button" key={i.id} onClick={() => toggle(i.id)}
              className={`rounded-full border px-3 py-1 text-sm ${selected.includes(i.id) ? 'bg-black text-white' : ''}`}>
              {i.nombre}
            </button>
          ))}
        </div>
      </div>
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      <div className="flex gap-2">
        <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="rounded bg-gray-200 px-4 py-2" onClick={logout}>Cerrar sesión</button>
      </div>
    </main>
  );
}
