'use client';
import { useEffect, useState } from 'react';
import { Store, ImageUp, BadgePercent, Power } from 'lucide-react';
import { api } from '../../../../lib/api';
import { CommerceShell } from '../../../../components/CommerceShell';

type Profile = {
  id: string; nombre: string; descripcion: string | null; email: string;
  porcentajeDescuento: number; logo: string | null; activo: boolean;
};

const inputCls = 'w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15';
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-guinda">{title}</h2>
      {children}
    </div>
  );
}

export default function ComercioPerfilPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [email, setEmail] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [logoMsg, setLogoMsg] = useState('');
  const [logoOk, setLogoOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  function hydrate(pr: Profile) {
    setP(pr); setNombre(pr.nombre); setDescripcion(pr.descripcion ?? ''); setEmail(pr.email);
  }

  useEffect(() => {
    api('/commerce/me/profile').then(async (r) => { if (r.ok) hydrate(await r.json()); }).catch(() => {});
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setSavedMsg(''); setSaving(true);
    try {
      const res = await api('/commerce/me/profile', { method: 'PATCH', body: JSON.stringify({ nombre, descripcion, email }) });
      if (res.ok) { hydrate(await res.json()); setSavedOk(true); setSavedMsg('Perfil actualizado.'); }
      else { setSavedOk(false); setSavedMsg(res.status === 409 ? 'Ese correo ya está en uso.' : 'No se pudo actualizar.'); }
    } finally { setSaving(false); }
  }

  async function cambiarPwd(e: React.FormEvent) {
    e.preventDefault(); setPwdMsg('');
    if (pwd.newPassword.length < 8) { setPwdOk(false); setPwdMsg('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (pwd.newPassword !== pwd.newPasswordConfirm) { setPwdOk(false); setPwdMsg('Las contraseñas no coinciden.'); return; }
    setPwdSaving(true);
    try {
      const { newPasswordConfirm, ...body } = pwd;
      const res = await api('/commerce/me/password', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) { setPwd({ currentPassword: '', newPassword: '', newPasswordConfirm: '' }); setPwdOk(true); setPwdMsg('Contraseña cambiada.'); }
      else { setPwdOk(false); setPwdMsg(res.status === 400 ? 'La contraseña actual es incorrecta o la nueva es muy corta.' : 'No se pudo cambiar.'); }
    } finally { setPwdSaving(false); }
  }

  async function subirLogo(file: File) {
    setLogoMsg(''); setUploading(true);
    try {
      const body = new FormData();
      body.append('logo', file);
      const res = await fetch(`${BASE}/commerce/me/logo`, { method: 'POST', credentials: 'include', body });
      if (res.ok) { setLogoOk(true); setLogoMsg('Logo actualizado.'); setLogoVersion((v) => v + 1); }
      else if (res.status === 400) { setLogoOk(false); setLogoMsg('Formato inválido. Usa una imagen PNG o JPG.'); }
      else { setLogoOk(false); setLogoMsg('No se pudo subir el logo.'); }
    } catch { setLogoOk(false); setLogoMsg('No se pudo conectar con el servidor.'); }
    finally { setUploading(false); }
  }

  if (!p) return <CommerceShell><p className="text-sm text-gray-500">Cargando…</p></CommerceShell>;

  return (
    <CommerceShell>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight text-guinda">Mi perfil</h1>
      <p className="mt-1 text-sm text-gray-500">Edita los datos de tu comercio y tu acceso.</p>

      <div className="mt-5 space-y-4">
        <Card title="Datos del comercio">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-guinda text-white">
              <Store size={20} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-guinda/25 px-3 py-1 text-xs font-semibold text-guinda">
                <BadgePercent size={13} />{p.porcentajeDescuento}% de descuento
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${p.activo ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                <Power size={13} />{p.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <p className="mb-4 text-xs text-gray-400">El % de descuento y el estado los administra el ayuntamiento.</p>

          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre del comercio</label>
              <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</label>
              <textarea className={inputCls} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Café y postres" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Correo</label>
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {savedMsg && <p className={`text-sm ${savedOk ? 'text-success' : 'text-danger'}`}>{savedMsg}</p>}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-semibold text-white hover:bg-guinda-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        </Card>

        <Card title="Logo">
          <div className="flex items-center gap-4">
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${BASE}/benefits/${p.id}/logo?v=${logoVersion}`} alt={p.nombre} className="h-20 w-20 rounded-xl border border-black/10 object-cover" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-black/15 text-gray-300"><Store size={28} /></span>
            )}
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-guinda/25 px-4 py-2 text-sm font-semibold text-guinda hover:bg-guinda/5">
                <ImageUp size={15} />{uploading ? 'Subiendo…' : 'Subir logo'}
                <input
                  type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); e.target.value = ''; }}
                />
              </label>
              <p className="mt-1.5 text-xs text-gray-400">PNG o JPG, máx. 5 MB. Se muestra en el directorio de beneficios.</p>
              {logoMsg && <p className={`mt-1 text-sm ${logoOk ? 'text-success' : 'text-danger'}`}>{logoMsg}</p>}
            </div>
          </div>
        </Card>

        <Card title="Cambiar contraseña">
          <form onSubmit={cambiarPwd} className="space-y-3">
            <input className={inputCls} type="password" placeholder="Contraseña actual" required
              value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
            <input className={inputCls} type="password" minLength={8} placeholder="Nueva contraseña (mín. 8)" required
              value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
            <div>
              <input
                className={`${inputCls} ${pwd.newPasswordConfirm && pwd.newPassword !== pwd.newPasswordConfirm ? 'border-danger focus:border-danger focus:ring-danger/15' : ''}`}
                type="password" placeholder="Confirmar nueva contraseña" required
                value={pwd.newPasswordConfirm} onChange={(e) => setPwd({ ...pwd, newPasswordConfirm: e.target.value })}
              />
              {pwd.newPasswordConfirm && pwd.newPassword !== pwd.newPasswordConfirm && <p className="mt-1 text-xs text-danger">Las contraseñas no coinciden.</p>}
            </div>
            {pwdMsg && <p className={`text-sm ${pwdOk ? 'text-success' : 'text-danger'}`}>{pwdMsg}</p>}
            <button type="submit" disabled={pwdSaving || !pwd.newPassword || pwd.newPassword !== pwd.newPasswordConfirm} className="rounded-full border border-guinda/25 px-5 py-2.5 text-sm font-semibold text-guinda hover:bg-guinda/5 disabled:opacity-50">
              {pwdSaving ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </Card>
      </div>
    </CommerceShell>
  );
}
