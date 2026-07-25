'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { AuthLayout, authInput } from '../../../components/AuthLayout';

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await api('/students/password-reset/request', { method: 'POST', body: JSON.stringify({ correo }) }); }
    catch { /* no revelar errores */ }
    setSent(true); setLoading(false);
  }

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" footer={<Link href="/ingresar" className="font-semibold text-white underline">Volver a iniciar sesión</Link>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={40} className="text-success" />
          <p className="text-sm text-gray-600">Si el correo existe, te enviamos un enlace para restablecer tu contraseña.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecerla."
      footer={<Link href="/ingresar" className="font-semibold text-white underline">Volver a iniciar sesión</Link>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-ink"><Mail size={14} className="text-guinda" />Correo electrónico</label>
          <input className={authInput} type="email" placeholder="Tu correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-guinda px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-guinda-700 disabled:opacity-50">
          <Send size={16} />{loading ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>
    </AuthLayout>
  );
}
