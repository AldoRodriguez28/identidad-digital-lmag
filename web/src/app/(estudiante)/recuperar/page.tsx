'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/students/password-reset/request', { method: 'POST', body: JSON.stringify({ correo }) });
    } catch { /* no revelar errores */ }
    setSent(true);
  }

  if (sent) {
    return <main className="mx-auto mt-24 max-w-sm p-6">Si el correo existe, te enviamos un enlace para restablecer tu contraseña.</main>;
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Recuperar contraseña</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Tu correo" type="email"
          value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Enviar enlace</button>
      </form>
    </main>
  );
}
