'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, LogIn } from 'lucide-react';
import { api } from '../../../lib/api';
import { AuthLayout, authInput } from '../../../components/AuthLayout';

export default function IngresarPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api('/auth/ingresar', { method: 'POST', body: JSON.stringify({ email, password, remember }) });
      if (res.ok) {
        const { redirect } = await res.json();
        router.push(redirect ?? '/perfil');
      } else setError('Correo o contraseña incorrectos.');
    } catch { setError('No se pudo conectar con el servidor.'); } finally { setLoading(false); }
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Accede con tu correo a tu cuenta (joven, comercio o administrador)."
      footer={<>¿Aún no tienes cuenta? <Link href="/registro" className="font-semibold text-white underline">Regístrate aquí</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Mail size={14} className="text-guinda" />Correo electrónico</label>
          <input className={authInput} type="email" placeholder="Ingresa tu correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Lock size={14} className="text-guinda" />Contraseña</label>
          <input className={authInput} type="password" placeholder="Ingresa tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="accent-guinda" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Mantener sesión iniciada
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-guinda px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-guinda-700 disabled:opacity-50">
          <LogIn size={16} />{loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  );
}
