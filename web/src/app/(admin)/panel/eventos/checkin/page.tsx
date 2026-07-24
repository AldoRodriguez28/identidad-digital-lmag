'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../../../lib/api';

type Event = { id: string; titulo: string; activo: boolean };
type Result = { student: { nombreCompleto: string; nivel: string }; puntosOtorgados: number; puntosAcumulados: number };

// Acepta la URL `.../c/<token>` o el token pelón.
function extractToken(value: string): string {
  const t = value.trim();
  const idx = t.lastIndexOf('/c/');
  if (idx >= 0) return t.slice(idx + 3).split(/[/?#]/)[0];
  return t;
}

export default function CheckinPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState('');
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    api('/admin/events').then(async (r) => {
      if (!mountedRef.current) return;
      if (r.ok) {
        const list: Event[] = await r.json();
        const activos = list.filter((e) => e.activo);
        setEvents(activos);
        if (activos[0]) setEventId(activos[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    scannerRef.current?.stop().catch(() => {});
  }, []);

  async function checkin(rawValue: string) {
    setError(''); setResult(null);
    if (!eventId) { setError('Selecciona un evento.'); return; }
    const credentialToken = extractToken(rawValue);
    if (!credentialToken) { setError('Token vacío.'); return; }
    try {
      const res = await api(`/admin/events/${eventId}/checkin`, { method: 'POST', body: JSON.stringify({ credentialToken }) });
      if (!mountedRef.current) return;
      if (res.ok) setResult(await res.json());
      else if (res.status === 409) setError('Este joven ya hizo check-in en este evento.');
      else if (res.status === 404) setError('Credencial o evento no válido.');
      else setError('No se pudo registrar el check-in.');
    } catch {
      if (!mountedRef.current) return;
      setError('No se pudo conectar con el servidor.');
    }
  }

  async function startScan() {
    setError('');
    busyRef.current = false;
    const scanner = new Html5Qrcode('qr-reader');
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decoded) => {
          if (busyRef.current) return;
          busyRef.current = true;
          try {
            await scanner.stop().catch(() => {});
            scannerRef.current = null;
            setScanning(false);
            await checkin(decoded);
          } finally {
            busyRef.current = false;
          }
        },
        () => {},
      );
      scannerRef.current = scanner;
      setScanning(true);
    } catch {
      await scanner.stop().catch(() => {});
      scannerRef.current = null;
      setScanning(false);
      setError('No se pudo abrir la cámara. Usa la entrada manual.');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-semibold">Check-in de evento</h1>

      <select className="w-full rounded border p-2" value={eventId} onChange={(e) => setEventId(e.target.value)}>
        {events.length === 0 && <option value="">No hay eventos activos</option>}
        {events.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
      </select>

      <div id="qr-reader" className="w-full" />
      <button className="w-full rounded bg-black p-2 text-white disabled:opacity-50" onClick={startScan} disabled={scanning || !eventId}>
        Escanear con cámara
      </button>

      <form onSubmit={(e) => { e.preventDefault(); checkin(manual); }} className="space-y-2">
        <input className="w-full rounded border p-2" placeholder="…o pega el token / URL de la credencial"
          value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="w-full rounded border p-2" type="submit">Registrar manualmente</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-xl border p-4">
          <p className="text-lg font-semibold">{result.student.nombreCompleto}</p>
          <p className="text-sm">Nivel: <b className="capitalize">{result.student.nivel}</b></p>
          <p className="mt-2 text-2xl font-bold text-green-600">+{result.puntosOtorgados} pts</p>
          <p className="text-sm text-gray-500">Total: {result.puntosAcumulados} pts</p>
        </div>
      )}
    </main>
  );
}
