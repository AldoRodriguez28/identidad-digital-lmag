'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Check, Share2, AtSign, Music2, MessageCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { StudentShell } from '../../../components/StudentShell';

type Interest = { id: string; nombre: string; categoria?: string };
type Profile = {
  telefono: string; facebook: string | null; instagram: string | null; tiktok: string | null; whatsapp: string | null;
  interests: Interest[];
};
type ContactForm = { telefono: string; facebook: string; instagram: string; tiktok: string; whatsapp: string };

const inputCls = 'w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-guinda">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [originalInterests, setOriginalInterests] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [originalContact, setOriginalContact] = useState<ContactForm | null>(null);
  const [contact, setContact] = useState<ContactForm>({ telefono: '', facebook: '', instagram: '', tiktok: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);

  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsMsg, setInterestsMsg] = useState('');
  const [interestsOk, setInterestsOk] = useState(false);

  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [contactOk, setContactOk] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/students/me/profile'),
      api('/interests'),
    ]).then(async ([profileRes, interestsRes]) => {
      if (!profileRes.ok) { router.push('/ingresar'); return; }
      const profile: Profile = await profileRes.json();
      const ids = (profile.interests ?? []).map((i) => i.id);
      setOriginalInterests(ids);
      setSelected(ids);
      const c: ContactForm = {
        telefono: profile.telefono ?? '',
        facebook: profile.facebook ?? '',
        instagram: profile.instagram ?? '',
        tiktok: profile.tiktok ?? '',
        whatsapp: profile.whatsapp ?? '',
      };
      setOriginalContact(c);
      setContact(c);
      if (interestsRes.ok) setAllInterests(await interestsRes.json());
    }).catch(() => router.push('/ingresar')).finally(() => setLoading(false));
  }, [router]);

  function toggle(id: string) {
    setInterestsMsg('');
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function setContactField(k: keyof ContactForm, v: string) {
    setContactMsg('');
    setContact((prev) => ({ ...prev, [k]: v }));
  }

  const interestsDirty = selected.length !== originalInterests.length || selected.some((id) => !originalInterests.includes(id));
  const contactDirty = !!originalContact && (Object.keys(contact) as (keyof ContactForm)[]).some((k) => contact[k] !== originalContact[k]);

  async function guardarIntereses() {
    setSavingInterests(true); setInterestsMsg('');
    try {
      const res = await api('/students/me/profile', { method: 'PATCH', body: JSON.stringify({ interestIds: selected }) });
      if (res.ok) { setOriginalInterests(selected); setInterestsOk(true); setInterestsMsg('Tus intereses se actualizaron.'); }
      else { setInterestsOk(false); setInterestsMsg('No se pudo guardar. Intenta de nuevo.'); }
    } catch { setInterestsOk(false); setInterestsMsg('Error de red.'); } finally { setSavingInterests(false); }
  }

  async function guardarContacto() {
    setSavingContact(true); setContactMsg('');
    try {
      const res = await api('/students/me/profile', { method: 'PATCH', body: JSON.stringify(contact) });
      if (res.ok) { setOriginalContact(contact); setContactOk(true); setContactMsg('Tus datos de contacto se actualizaron.'); }
      else { setContactOk(false); setContactMsg('No se pudo guardar. Intenta de nuevo.'); }
    } catch { setContactOk(false); setContactMsg('Error de red.'); } finally { setSavingContact(false); }
  }

  const groups = allInterests.reduce<Record<string, Interest[]>>((acc, i) => {
    const key = i.categoria || 'Otros';
    (acc[key] ??= []).push(i);
    return acc;
  }, {});

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Configuración</h1>
          <p className="mt-1 text-sm text-gray-500">Administra tus preferencias de cuenta.</p>
        </div>

        <Card title="Datos de contacto" subtitle="Tu número de celular y usuarios de redes sociales.">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Teléfono</label>
                  <input className={inputCls} value={contact.telefono} onChange={(e) => setContactField('telefono', e.target.value)} placeholder="10 dígitos" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Share2 size={14} className="text-guinda" />Facebook</label>
                  <input className={inputCls} value={contact.facebook} onChange={(e) => setContactField('facebook', e.target.value)} placeholder="usuario o URL" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><AtSign size={14} className="text-guinda" />Instagram</label>
                  <input className={inputCls} value={contact.instagram} onChange={(e) => setContactField('instagram', e.target.value)} placeholder="@usuario" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Music2 size={14} className="text-guinda" />TikTok</label>
                  <input className={inputCls} value={contact.tiktok} onChange={(e) => setContactField('tiktok', e.target.value)} placeholder="@usuario" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><MessageCircle size={14} className="text-guinda" />WhatsApp</label>
                  <input className={inputCls} value={contact.whatsapp} onChange={(e) => setContactField('whatsapp', e.target.value)} placeholder="10 dígitos" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                <button onClick={guardarContacto} disabled={!contactDirty || savingContact}
                  className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-semibold text-white hover:bg-guinda-700 disabled:opacity-50">
                  <Check size={15} />{savingContact ? 'Guardando…' : 'Guardar cambios'}
                </button>
                {contactMsg && <p className={`text-sm ${contactOk ? 'text-success' : 'text-danger'}`}>{contactMsg}</p>}
              </div>
            </>
          )}
        </Card>

        <Card title="Intereses" subtitle="Elige los temas que te interesan. Los usamos para recomendarte eventos, becas y talleres.">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : allInterests.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay intereses disponibles.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groups).map(([categoria, items]) => (
                <div key={categoria}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{categoria}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((i) => {
                      const on = selected.includes(i.id);
                      return (
                        <button key={i.id} type="button" onClick={() => toggle(i.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-guinda bg-guinda text-white' : 'border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
                          <Heart size={13} className={on ? 'fill-white text-white' : 'text-guinda'} />
                          {i.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
            <button onClick={guardarIntereses} disabled={!interestsDirty || savingInterests}
              className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-semibold text-white hover:bg-guinda-700 disabled:opacity-50">
              <Check size={15} />{savingInterests ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {interestsMsg && <p className={`text-sm ${interestsOk ? 'text-success' : 'text-danger'}`}>{interestsMsg}</p>}
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}
