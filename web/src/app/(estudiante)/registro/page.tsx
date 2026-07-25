'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '../../../lib/api';
import { authInput } from '../../../components/AuthLayout';

type Interest = { id: string; nombre: string };

function Section({ title }: { title: string }) {
  return <h2 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-guinda">{title}</h2>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink">{label}{required && <span className="text-danger"> *</span>}</label>
      {children}
    </div>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '', curp: '', sexo: '', escolaridad: '',
    correo: '', telefono: '', calle: '', colonia: '', codigoPostal: '', numExt: '', password: '',
    facebook: '', instagram: '', tiktok: '',
  });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/interests').then(async (r) => { if (r.ok) setInterests(await r.json()); }).catch(() => {});
  }, []);

  function set(k: string, v: string) { setF((prev) => ({ ...prev, [k]: v })); }
  function toggle(id: string) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const nombreCompleto = [f.nombre, f.apellidoPaterno, f.apellidoMaterno].map((x) => x.trim()).filter(Boolean).join(' ');
      const res = await api('/students/register', { method: 'POST', body: JSON.stringify({ ...f, nombreCompleto, interestIds: selected }) });
      if (res.ok) router.push('/ingresar');
      else if (res.status === 409) setError('El correo o CURP ya está registrado.');
      else setError('Revisa los datos del formulario.');
    } catch { setError('No se pudo conectar con el servidor.'); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Formulario */}
      <div className="overflow-y-auto px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-xl">
          <div className="mb-5 flex items-center gap-4">
            <Image src="/brand/logo-ayuntamiento.png" alt="Ayuntamiento de San Andrés Tuxtla" width={528} height={256} priority className="h-auto w-40" />
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-guinda">Registro</h1>
          </div>
          <p className="mb-6 text-sm text-gray-500">
            Únete a la comunidad juvenil de <b className="text-guinda">San Andrés Tuxtla</b> y disfruta de <b className="text-guinda">beneficios exclusivos</b> para ti.
          </p>

          <form onSubmit={submit} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-guinda">Crea tu cuenta</h2>
            <p className="mt-0.5 text-xs text-gray-500">Completa tus datos para formar parte de Juventud San Andrés.</p>

            <Section title="Datos personales" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre" required><input className={authInput} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ingresa tu nombre" required /></Field>
              <Field label="Apellido paterno" required><input className={authInput} value={f.apellidoPaterno} onChange={(e) => set('apellidoPaterno', e.target.value)} placeholder="Apellido paterno" required /></Field>
              <Field label="Apellido materno" required><input className={authInput} value={f.apellidoMaterno} onChange={(e) => set('apellidoMaterno', e.target.value)} placeholder="Apellido materno" required /></Field>
              <Field label="Fecha de nacimiento" required><input className={authInput} type="date" value={f.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} required /></Field>
              <Field label="CURP" required><input className={authInput} value={f.curp} onChange={(e) => set('curp', e.target.value)} placeholder="18 caracteres" required /></Field>
              <Field label="Sexo" required>
                <select className={authInput} value={f.sexo} onChange={(e) => set('sexo', e.target.value)} required>
                  <option value="">Selecciona una opción</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </Field>
              <Field label="Escolaridad" required><input className={authInput} value={f.escolaridad} onChange={(e) => set('escolaridad', e.target.value)} placeholder="Ej. Preparatoria" required /></Field>
            </div>

            <Section title="Contacto y acceso" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Correo electrónico" required><input className={authInput} type="email" value={f.correo} onChange={(e) => set('correo', e.target.value)} placeholder="tucorreo@ejemplo.com" required /></Field>
              <Field label="Teléfono" required><input className={authInput} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="10 dígitos" required /></Field>
              <Field label="Contraseña" required><input className={authInput} type="password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" required /></Field>
            </div>

            <Section title="Domicilio" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Calle y referencias" required><input className={authInput} value={f.calle} onChange={(e) => set('calle', e.target.value)} placeholder="Calle" required /></Field>
              <Field label="Colonia" required><input className={authInput} value={f.colonia} onChange={(e) => set('colonia', e.target.value)} placeholder="Colonia" required /></Field>
              <Field label="Código postal" required><input className={authInput} value={f.codigoPostal} onChange={(e) => set('codigoPostal', e.target.value)} placeholder="95700" required /></Field>
              <Field label="Número exterior" required><input className={authInput} value={f.numExt} onChange={(e) => set('numExt', e.target.value)} placeholder="Núm." required /></Field>
            </div>

            <Section title="Redes sociales (opcional)" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Facebook"><input className={authInput} value={f.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="usuario o URL" /></Field>
              <Field label="Instagram"><input className={authInput} value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario" /></Field>
              <Field label="TikTok"><input className={authInput} value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="@usuario" /></Field>
            </div>

            <Section title="Intereses" />
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <button type="button" key={i.id} onClick={() => toggle(i.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${selected.includes(i.id) ? 'border-guinda bg-guinda text-white' : 'border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
                  {i.nombre}
                </button>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <button type="submit" className="mt-6 w-full rounded-full bg-guinda px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-guinda-700">
              Crear mi cuenta
            </button>
            <p className="mt-3 text-center text-sm text-gray-500">
              ¿Ya tienes cuenta? <Link href="/ingresar" className="font-semibold text-guinda hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>

      {/* Panel de imagen */}
      <div className="relative hidden lg:block">
        <Image src="/brand/hero-jovenes.jpg" alt="Jóvenes de San Andrés Tuxtla" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-guinda/30" />
        <div className="absolute right-6 top-6 rounded-xl bg-guinda px-4 py-2 text-right text-white shadow-lg">
          <p className="text-sm font-extrabold uppercase leading-tight">Jóvenes fuertes,<br />economía fuerte.</p>
        </div>
      </div>
    </div>
  );
}
