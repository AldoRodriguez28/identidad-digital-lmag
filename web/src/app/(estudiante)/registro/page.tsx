'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User, PenLine, CalendarDays, IdCard, VenusAndMars, CreditCard, MapPin, Map, Mail, Hash, Route,
  Phone, Share2, AtSign, Music2, MessageCircle, GraduationCap, Lock, UserPlus, Users, ChevronDown, Heart,
} from 'lucide-react';
import { api } from '../../../lib/api';

type Interest = { id: string; nombre: string };

const INK = '#241512';
const MUTED = '#6b625d';

function Section({ title, first, children }: { title?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div className={first ? '' : 'mt-7 border-t pt-7'} style={first ? undefined : { borderColor: 'rgba(88,16,31,0.1)' }}>
      {title && (
        <p className="mb-4 text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-guinda">{title}</p>
      )}
      {children}
    </div>
  );
}

function Field({
  label, icon: Icon, required, full, error, children,
}: { label: string; icon?: React.ElementType; required?: boolean; full?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${full ? 'min-[576px]:col-span-2' : ''}`}>
      <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: INK }}>
        {Icon && <Icon size={16} className="w-4 shrink-0 text-center text-guinda" />}
        {label}
        {required && <span className="text-guinda">*</span>}
      </label>
      {children}
      {error && <p className="text-[0.8125rem]" style={{ color: '#b3261e' }}>{error}</p>}
    </div>
  );
}

const inputCls =
  'block w-full rounded-md border bg-[#f8f7f4] px-3 py-1.5 text-base outline-none transition-colors focus:border-[#ac888f] focus:ring-4 focus:ring-guinda/25';
const inputStyle = { borderColor: '#dbdfe6', color: INK };
const errorInputStyle = { borderColor: '#b3261e', color: INK };
const fileInputCls = `${inputCls} cursor-pointer py-2 file:mr-3 file:rounded file:border-0 file:bg-guinda file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white`;

function IneFileInput({
  id, value, onChange, hasError, onFormatError,
}: { id: string; value: File | null; onChange: (f: File | null) => void; hasError?: boolean; onFormatError: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) { setPreview(null); return; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div>
      <input
        id={id} type="file" accept="image/png,image/jpeg" required={!value}
        className={fileInputCls} style={hasError ? errorInputStyle : inputStyle}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file && file.type !== 'image/png' && file.type !== 'image/jpeg') {
            e.target.value = '';
            onChange(null);
            onFormatError();
            return;
          }
          onChange(file);
        }}
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Vista previa" className="mt-2 h-28 w-full rounded-md border object-cover" style={{ borderColor: '#dbdfe6' }} />
      )}
    </div>
  );
}

// Mapea un mensaje de error del backend (o de validación local) al/los campo(s) del formulario
// al que se refiere, buscando palabras clave. "frente"/"reverso" ganan siempre primero porque
// los mensajes de INE también contienen "imagen", que si no se cae al fallback genérico marcaría los dos lados a la vez.
const FIELD_KEYWORDS: [string, string[]][] = [
  ['curp', ['curp']],
  ['correo', ['correo', 'email']],
  ['telefono', ['telefono', 'teléfono']],
  ['fechaNacimiento', ['fechanacimiento', 'fecha de nacimiento']],
  ['codigoPostal', ['codigopostal', 'código postal']],
  ['calle', ['calle']],
  ['colonia', ['colonia']],
  ['numExt', ['numext']],
  ['sexo', ['sexo']],
  ['escolaridad', ['escolaridad']],
  ['nombreCompleto', ['nombrecompleto']],
  ['password', ['contraseña', 'password']],
];

function fieldsForMessage(msg: string): string[] {
  const lower = msg.toLowerCase();
  if (lower.includes('frente')) return ['ineFrente'];
  if (lower.includes('reverso')) return ['ineReverso'];
  const specific = FIELD_KEYWORDS.filter(([, keywords]) => keywords.some((k) => lower.includes(k)));
  if (specific.length) return [...new Set(specific.map(([field]) => field))];
  if (lower.includes('ine') || lower.includes('imagen') || lower.includes('identificación')) return ['ineFrente', 'ineReverso'];
  return [];
}

export default function RegistroPage() {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '', curp: '', sexo: '', escolaridad: '',
    correo: '', telefono: '', calle: '', colonia: '', codigoPostal: '', numExt: '', numInt: '', entreCalles: '',
    password: '', passwordConfirm: '', facebook: '', instagram: '', tiktok: '', whatsapp: '',
  });
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ineFrente, setIneFrente] = useState<File | null>(null);
  const [ineReverso, setIneReverso] = useState<File | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api('/interests').then(async (r) => { if (r.ok) setInterests(await r.json()); }).catch(() => {});
  }, []);

  function set(k: string, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
    setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
  }
  function toggle(id: string) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  function inputStyleFor(k: string) { return fieldErrors[k] ? errorInputStyle : inputStyle; }
  function setIne(which: 'ineFrente' | 'ineReverso', file: File | null) {
    (which === 'ineFrente' ? setIneFrente : setIneReverso)(file);
    setFieldErrors((prev) => (prev[which] ? { ...prev, [which]: '' } : prev));
  }

  async function extractErrors(res: Response, fallback: string): Promise<{ banner: string; fields: Record<string, string> }> {
    let messages: string[] = [];
    try {
      const body = await res.json();
      if (Array.isArray(body?.message)) messages = body.message;
      else if (typeof body?.message === 'string') messages = [body.message];
    } catch {
      // respuesta sin JSON válido: se usa el fallback
    }
    if (!messages.length) messages = [fallback];
    const fields: Record<string, string> = {};
    for (const msg of messages) {
      for (const key of fieldsForMessage(msg)) fields[key] = msg;
    }
    return { banner: messages.join(' '), fields };
  }

  // Registro atómico: mientras el INE no se valide en el servidor, no se crea ninguna cuenta.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const localErrors: Record<string, string> = {};
    if (!ineFrente) localErrors.ineFrente = 'Sube el frente de tu INE.';
    if (!ineReverso) localErrors.ineReverso = 'Sube el reverso de tu INE.';
    if (f.password.length < 8) localErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (f.password !== f.passwordConfirm) localErrors.passwordConfirm = 'Las contraseñas no coinciden.';
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setError('Revisa los campos marcados en rojo.');
      return;
    }
    if (!aceptaTerminos) { setError('Debes aceptar los Términos y Condiciones para continuar.'); return; }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const nombreCompleto = [f.nombre, f.apellidoPaterno, f.apellidoMaterno].map((x) => x.trim()).filter(Boolean).join(' ');
      const { passwordConfirm, ...rest } = f;

      const body = new FormData();
      Object.entries({ ...rest, nombreCompleto }).forEach(([k, v]) => body.append(k, v));
      body.append('interestIds', JSON.stringify(selected));
      body.append('ineFrente', ineFrente!);
      body.append('ineReverso', ineReverso!);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/students/register`, {
        method: 'POST', credentials: 'include', body,
      });
      if (!res.ok) {
        const { banner, fields } = await extractErrors(res, 'Revisa los datos del formulario.');
        setError(Object.keys(fields).length ? 'Revisa los campos marcados en rojo.' : banner);
        setFieldErrors(fields);
        return;
      }

      router.push('/perfil');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-[992px]:flex min-[992px]:items-start">
      {/* Panel del formulario */}
      <div
        className="relative flex flex-col justify-center gap-6 bg-[#f8f7f4] px-6 py-10 pb-12 min-[576px]:px-10 min-[576px]:py-12 min-[992px]:z-[2] min-[992px]:w-[54%] min-[992px]:shrink-0 min-[992px]:px-16 min-[992px]:py-14"
      >
        <div className="flex flex-col items-center gap-5 text-center min-[576px]:flex-row min-[576px]:text-left">
          <Image src="/brand/logo-ayuntamiento.png" alt="Ayuntamiento de San Andrés Tuxtla" width={528} height={256} priority className="h-32 w-auto" />
          <h1 className="text-[2rem] font-extrabold text-guinda min-[992px]:text-[2.75rem]">REGISTRO</h1>
        </div>

        <p className="max-w-[32rem] text-[0.9375rem] leading-[1.6]" style={{ color: MUTED }}>
          Únete a la comunidad juvenil de <strong className="font-semibold text-guinda">San Andrés Tuxtla</strong> y disfruta de beneficios exclusivos para ti.
        </p>

        <div className="relative rounded-[1.25rem] bg-white p-7 shadow-[0_1.5rem_3rem_-1.25rem_#58101f59] min-[576px]:p-9">
          <div className="mb-7 flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dorado text-lg text-guinda">
              <User size={18} />
            </span>
            <div>
              <p className="mb-1 text-[1.125rem] font-extrabold text-guinda">CREA TU CUENTA</p>
              <p className="text-sm" style={{ color: MUTED }}>
                Completa tus datos para formar parte de <strong className="font-semibold text-guinda">Juventud San Andrés</strong>.
              </p>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <Section title="Datos personales" first>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[576px]:grid-cols-2">
                <Field label="Nombre" icon={PenLine} required>
                  <input className={inputCls} style={inputStyle} value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ingresa tu nombre" required />
                </Field>
                <Field label="Apellido paterno" icon={PenLine} required>
                  <input className={inputCls} style={inputStyle} value={f.apellidoPaterno} onChange={(e) => set('apellidoPaterno', e.target.value)} placeholder="Apellido paterno" required />
                </Field>
                <Field label="Apellido materno" icon={PenLine} required>
                  <input className={inputCls} style={inputStyle} value={f.apellidoMaterno} onChange={(e) => set('apellidoMaterno', e.target.value)} placeholder="Apellido materno" required />
                </Field>
                <Field label="Fecha de nacimiento" icon={CalendarDays} required error={fieldErrors.fechaNacimiento}>
                  <input className={inputCls} style={inputStyleFor('fechaNacimiento')} type="date" value={f.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} required />
                </Field>
                <Field label="CURP" icon={IdCard} required error={fieldErrors.curp}>
                  <input className={`${inputCls} uppercase`} style={inputStyleFor('curp')} value={f.curp} onChange={(e) => set('curp', e.target.value)} maxLength={18} placeholder="18 caracteres" required />
                </Field>
                <Field label="Sexo" icon={VenusAndMars} required error={fieldErrors.sexo}>
                  <div className="relative">
                    <select className={`${inputCls} appearance-none pr-9`} style={inputStyleFor('sexo')} value={f.sexo} onChange={(e) => set('sexo', e.target.value)} required>
                      <option value="">Selecciona una opción</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-guinda" />
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Identificación (INE)">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[576px]:grid-cols-2">
                <Field label="INE (frente)" icon={CreditCard} error={fieldErrors.ineFrente}>
                  <IneFileInput
                    id="ine_front" value={ineFrente} onChange={(file) => setIne('ineFrente', file)}
                    hasError={!!fieldErrors.ineFrente}
                    onFormatError={() => setFieldErrors((p) => ({ ...p, ineFrente: 'Solo se aceptan imágenes JPG o PNG.' }))}
                  />
                </Field>
                <Field label="INE (reverso)" icon={CreditCard} error={fieldErrors.ineReverso}>
                  <IneFileInput
                    id="ine_back" value={ineReverso} onChange={(file) => setIne('ineReverso', file)}
                    hasError={!!fieldErrors.ineReverso}
                    onFormatError={() => setFieldErrors((p) => ({ ...p, ineReverso: 'Solo se aceptan imágenes JPG o PNG.' }))}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Domicilio">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[576px]:grid-cols-2">
                <Field label="Domicilio" icon={MapPin} required full error={fieldErrors.calle}>
                  <input className={inputCls} style={inputStyleFor('calle')} value={f.calle} onChange={(e) => set('calle', e.target.value)} placeholder="Calle y referencias" required />
                </Field>
                <Field label="Colonia" icon={Map} required error={fieldErrors.colonia}>
                  <input className={inputCls} style={inputStyleFor('colonia')} value={f.colonia} onChange={(e) => set('colonia', e.target.value)} placeholder="Colonia" required />
                </Field>
                <Field label="Código postal" icon={Mail} required error={fieldErrors.codigoPostal}>
                  <input className={inputCls} style={inputStyleFor('codigoPostal')} value={f.codigoPostal} onChange={(e) => set('codigoPostal', e.target.value)} placeholder="95700" required />
                </Field>
                <Field label="Número exterior" icon={Hash} error={fieldErrors.numExt}>
                  <input className={inputCls} style={inputStyleFor('numExt')} value={f.numExt} onChange={(e) => set('numExt', e.target.value)} placeholder="Núm." />
                </Field>
                <Field label="Número interior" icon={Hash}>
                  <input className={inputCls} style={inputStyle} value={f.numInt} onChange={(e) => set('numInt', e.target.value)} />
                </Field>
                <Field label="Entre qué calles" icon={Route} full>
                  <input className={inputCls} style={inputStyle} value={f.entreCalles} onChange={(e) => set('entreCalles', e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Contacto y redes sociales">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[576px]:grid-cols-2">
                <Field label="Número de teléfono" icon={Phone} required error={fieldErrors.telefono}>
                  <input className={inputCls} style={inputStyleFor('telefono')} type="tel" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Ingresa tu número de teléfono" required />
                </Field>
                <Field label="Correo electrónico" icon={Mail} required error={fieldErrors.correo}>
                  <input className={inputCls} style={inputStyleFor('correo')} type="email" value={f.correo} onChange={(e) => set('correo', e.target.value)} placeholder="Ingresa tu correo electrónico" required />
                </Field>
                <Field label="Facebook" icon={Share2}>
                  <input className={inputCls} style={inputStyle} value={f.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="/usuario" />
                </Field>
                <Field label="Instagram" icon={AtSign}>
                  <input className={inputCls} style={inputStyle} value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario" />
                </Field>
                <Field label="TikTok" icon={Music2}>
                  <input className={inputCls} style={inputStyle} value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="@usuario" />
                </Field>
                <Field label="WhatsApp" icon={MessageCircle}>
                  <input className={inputCls} style={inputStyle} value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="Número de WhatsApp" />
                </Field>
              </div>
            </Section>

            <Section title="Escolaridad y cuenta">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[576px]:grid-cols-2">
                <Field label="Escolaridad" icon={GraduationCap} required full error={fieldErrors.escolaridad}>
                  <input className={inputCls} style={inputStyleFor('escolaridad')} value={f.escolaridad} onChange={(e) => set('escolaridad', e.target.value)} placeholder="Ej. Preparatoria" required />
                </Field>
                <Field label="Contraseña" icon={Lock} required error={fieldErrors.password}>
                  <input className={inputCls} style={inputStyleFor('password')} type="password" minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Crea una contraseña" required />
                </Field>
                <Field
                  label="Confirma tu contraseña" icon={Lock} required
                  error={f.passwordConfirm && f.password !== f.passwordConfirm ? 'Las contraseñas no coinciden.' : fieldErrors.passwordConfirm}
                >
                  <input
                    className={inputCls}
                    style={(f.passwordConfirm && f.password !== f.passwordConfirm) || fieldErrors.passwordConfirm ? errorInputStyle : inputStyle}
                    type="password" value={f.passwordConfirm} onChange={(e) => set('passwordConfirm', e.target.value)} placeholder="Repite tu contraseña" required
                  />
                </Field>
              </div>
            </Section>

            <Section title="Intereses">
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <button type="button" key={i.id} onClick={() => toggle(i.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${selected.includes(i.id) ? 'border-guinda bg-guinda text-white' : 'border-guinda/25 text-guinda hover:bg-guinda/5'}`}>
                    <Heart size={13} className={selected.includes(i.id) ? 'fill-white text-white' : 'text-guinda'} />
                    {i.nombre}
                  </button>
                ))}
              </div>
            </Section>

            <Section>
              <label className="flex items-start gap-2.5 text-sm leading-[1.5]" style={{ color: MUTED }}>
                <input
                  type="checkbox" required checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="mt-[0.2rem] h-[1.125rem] w-[1.125rem] shrink-0 accent-guinda"
                />
                <span>
                  He leído y acepto los <Link href="/terminos" target="_blank" className="font-semibold text-guinda hover:underline">términos y condiciones</Link> y el{' '}
                  <Link href="/terminos#privacidad" target="_blank" className="font-semibold text-guinda hover:underline">aviso de privacidad</Link>.
                </span>
              </label>

              {error && <p className="mt-4 text-sm" style={{ color: '#b3261e' }}>{error}</p>}

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={submitting || !f.password || f.password !== f.passwordConfirm || !aceptaTerminos}
                  className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-full bg-guinda px-6 py-3.5 text-base font-bold tracking-[0.02em] text-white transition-colors hover:bg-guinda-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus size={18} />
                  {submitting ? 'Registrando…' : 'REGÍSTRATE AHORA'}
                </button>
              </div>
            </Section>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: MUTED }}>
            ¿Ya tienes cuenta? <Link href="/ingresar" className="font-semibold text-guinda hover:underline">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>

      {/* Panel de foto */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#f8f7f4] bg-cover bg-center min-[992px]:sticky min-[992px]:top-0 min-[992px]:aspect-auto min-[992px]:h-screen min-[992px]:flex-1 min-[992px]:self-stretch"
        style={{ backgroundImage: "url('/brand/hero-jovenes.jpg')" }}
        role="img"
        aria-label="Jóvenes de San Andrés Tuxtla mostrando su credencial digital."
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent to-black/[0.28]" />
        <span
          className="absolute right-0 top-0 z-[2] flex items-center gap-3.5 bg-guinda px-8 pb-6 pt-[1.125rem] text-white shadow-[0_0.5rem_1rem_rgba(0,0,0,0.25)]"
          style={{ clipPath: 'polygon(6% 0,100% 0,100% 100%,0 100%)' }}
        >
          <span className="flex shrink-0 items-center justify-center text-dorado"><Users size={28} /></span>
          <span className="text-sm font-extrabold leading-[1.3] tracking-[0.01em] min-[576px]:text-base">JÓVENES FUERTES,<br />COMUNIDAD FUERTE.</span>
        </span>
      </div>
    </div>
  );
}
