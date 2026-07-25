'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Check } from 'lucide-react';
import { api } from '../../../../lib/api';
import { AuthLayout, authInput } from '../../../../components/AuthLayout';

export default function ConfirmarResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api('/students/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) });
      if (res.ok) router.push('/ingresar');
      else setError('El enlace no es válido o expiró.');
    } catch { setError('No se pudo conectar con el servidor.'); } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Lock size={14} className="text-guinda" />Nueva contraseña</label>
          <input className={authInput} type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-guinda px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-guinda-700 disabled:opacity-50">
          <Check size={16} />{loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  );
}
