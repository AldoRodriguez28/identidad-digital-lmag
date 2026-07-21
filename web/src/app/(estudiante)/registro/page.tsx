'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type Interest = { id: string; nombre: string };

export default function RegistroPage() {
  const router = useRouter();
  const [f, setF] = useState({
    nombreCompleto: '', fechaNacimiento: '', curp: '', sexo: '', escolaridad: '',
    correo: '', telefono: '', calle: '', colonia: '', codigoPostal: '', numExt: '', password: '',
  });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/interests').then(async (r) => { if (r.ok) setInterests(await r.json()); }).catch(() => {});
  }, []);

  function set(k: string, v: string) { setF((prev) => ({ ...prev, [k]: v })); }
  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/students/register', {
        method: 'POST',
        body: JSON.stringify({ ...f, interestIds: selected }),
      });
      if (res.ok) router.push('/ingresar');
      else if (res.status === 409) setError('El correo o CURP ya está registrado.');
      else setError('Revisa los datos del formulario.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  }

  const fields: [string, string, string?][] = [
    ['nombreCompleto', 'Nombre completo'], ['fechaNacimiento', 'Fecha de nacimiento', 'date'],
    ['curp', 'CURP'], ['sexo', 'Sexo'], ['escolaridad', 'Escolaridad'],
    ['correo', 'Correo', 'email'], ['telefono', 'Teléfono'], ['calle', 'Calle'],
    ['colonia', 'Colonia'], ['codigoPostal', 'Código postal'], ['numExt', 'Número exterior'],
    ['password', 'Contraseña (mín. 8)', 'password'],
  ];

  return (
    <main className="mx-auto mt-10 max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Crear mi cuenta</h1>
      <form onSubmit={submit} className="space-y-3">
        {fields.map(([k, label, type]) => (
          <input key={k} className="w-full rounded border p-2" placeholder={label}
            type={type ?? 'text'} value={(f as any)[k]}
            onChange={(e) => set(k, e.target.value)} />
        ))}
        <div>
          <p className="mb-1 text-sm font-medium">Intereses</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <button type="button" key={i.id} onClick={() => toggle(i.id)}
                className={`rounded-full border px-3 py-1 text-sm ${selected.includes(i.id) ? 'bg-black text-white' : ''}`}>
                {i.nombre}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white" type="submit">Registrarme</button>
      </form>
    </main>
  );
}
