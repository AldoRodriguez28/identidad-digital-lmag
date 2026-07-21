'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function IngresarPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/students/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password, remember }),
      });
      if (res.ok) router.push('/perfil');
      else setError('Correo o contraseña incorrectos.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Ingresar</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Correo" type="email"
          value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="Contraseña" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Mantener sesión iniciada
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Entrar</button>
      </form>
    </main>
  );
}
