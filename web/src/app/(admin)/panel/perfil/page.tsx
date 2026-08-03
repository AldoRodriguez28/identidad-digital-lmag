'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { PageHeader, Card, Button, Badge, inputCls } from '../_components/ui';

type Me = { id: string; email: string; nombre: string; rol: string };

export default function PerfilAdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdOk, setPwdOk] = useState(false);

  useEffect(() => {
    api('/admin/me').then(async (r) => {
      if (r.ok) { const m = await r.json(); setMe(m); setNombre(m.nombre); setEmail(m.email); }
    }).catch(() => {});
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setSavedMsg('');
    const res = await api('/admin/me', { method: 'PATCH', body: JSON.stringify({ nombre, email }) });
    if (res.ok) { const m = await res.json(); setMe(m); setSavedOk(true); setSavedMsg('Perfil actualizado.'); }
    else { setSavedOk(false); setSavedMsg(res.status === 409 ? 'Ese correo ya está en uso.' : 'No se pudo actualizar.'); }
  }

  async function cambiarPwd(e: React.FormEvent) {
    e.preventDefault(); setPwdMsg('');
    if (pwd.newPassword.length < 8) { setPwdOk(false); setPwdMsg('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (pwd.newPassword !== pwd.newPasswordConfirm) { setPwdOk(false); setPwdMsg('Las contraseñas no coinciden.'); return; }
    const { newPasswordConfirm, ...body } = pwd;
    const res = await api('/admin/me/password', { method: 'POST', body: JSON.stringify(body) });
    if (res.ok) { setPwd({ currentPassword: '', newPassword: '', newPasswordConfirm: '' }); setPwdOk(true); setPwdMsg('Contraseña cambiada.'); }
    else { setPwdOk(false); setPwdMsg(res.status === 400 ? 'La contraseña actual es incorrecta o la nueva es muy corta.' : 'No se pudo cambiar.'); }
  }

  if (!me) return <p className="text-sm text-gray-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mi Perfil" subtitle="Edita tus datos de acceso al panel." />

      <Card className="mb-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-guinda text-lg font-semibold text-white">
            {me.nombre.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
          </span>
          <div>
            <p className="font-semibold text-ink">{me.nombre}</p>
            <Badge>{me.rol === 'admin' ? 'Administrador' : 'Gestor'}</Badge>
          </div>
        </div>
        <form onSubmit={guardar} className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</label>
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
          <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Correo</label>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {savedMsg && <p className={`text-sm ${savedOk ? 'text-success' : 'text-danger'}`}>{savedMsg}</p>}
          <Button type="submit">Guardar cambios</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-guinda">Cambiar contraseña</h2>
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
          <Button type="submit" variant="outline" disabled={!pwd.newPassword || pwd.newPassword !== pwd.newPasswordConfirm}>Cambiar contraseña</Button>
        </form>
      </Card>
    </div>
  );
}
