'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

type Me = { id: string; email: string; nombre: string; rol: string };

export default function PerfilAdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');

  useEffect(() => {
    api('/admin/me').then(async (r) => {
      if (r.ok) { const m = await r.json(); setMe(m); setNombre(m.nombre); setEmail(m.email); }
    }).catch(() => {});
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSavedMsg('');
    const res = await api('/admin/me', { method: 'PATCH', body: JSON.stringify({ nombre, email }) });
    if (res.ok) { const m = await res.json(); setMe(m); setSavedMsg('Perfil actualizado.'); }
    else if (res.status === 409) setSavedMsg('Ese correo ya está en uso.');
    else setSavedMsg('No se pudo actualizar.');
  }

  async function cambiarPwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    const res = await api('/admin/me/password', { method: 'POST', body: JSON.stringify(pwd) });
    if (res.ok) { setPwd({ currentPassword: '', newPassword: '' }); setPwdMsg('Contraseña cambiada.'); }
    else if (res.status === 400) setPwdMsg('La contraseña actual es incorrecta o la nueva es muy corta.');
    else setPwdMsg('No se pudo cambiar.');
  }

  if (!me) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-gray-500">Rol: {me.rol}</p>
      </div>
      <form onSubmit={guardar} className="space-y-2">
        <input className="w-full rounded border p-2" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required />
        <input className="w-full rounded border p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" required />
        {savedMsg && <p className="text-sm text-green-600">{savedMsg}</p>}
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Guardar</button>
      </form>
      <form onSubmit={cambiarPwd} className="space-y-2 border-t pt-4">
        <h2 className="text-sm font-medium">Cambiar contraseña</h2>
        <input className="w-full rounded border p-2" type="password" placeholder="Contraseña actual" required
          value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
        <input className="w-full rounded border p-2" type="password" placeholder="Nueva contraseña (mín. 8)" required
          value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
        {pwdMsg && <p className="text-sm text-green-600">{pwdMsg}</p>}
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Cambiar contraseña</button>
      </form>
    </main>
  );
}
