'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../../lib/api';

type Result = { student: { nombreCompleto: string; nivel: string }; porcentajeDescuento: number };

// Extrae el credentialToken de un valor escaneado: acepta la URL `.../c/<token>` o el token pelón.
function extractToken(value: string): string {
  const trimmed = value.trim();
  const idx = trimmed.lastIndexOf('/c/');
  if (idx >= 0) return trimmed.slice(idx + 3).split(/[/?#]/)[0];
  return trimmed;
}

export default function ComercioValidarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Prevents double-scan race: set to true as soon as a QR decode fires,
  // reset in finally after validate() resolves.
  const busyRef = useRef(false);

  useEffect(() => {
    api('/commerce/me').then((r) => {
      if (r.ok) setReady(true);
      else router.push('/comercio/ingresar');
    }).catch(() => router.push('/comercio/ingresar'));
  }, [router]);

  async function validate(rawValue: string) {
    setError(''); setResult(null);
    const credentialToken = extractToken(rawValue);
    if (!credentialToken) { setError('Token vacío.'); return; }
    try {
      const res = await api('/commerce/validate', { method: 'POST', body: JSON.stringify({ credentialToken }) });
      if (res.ok) setResult(await res.json());
      else if (res.status === 404) setError('Credencial no encontrada.');
      else setError('No se pudo validar.');
    } catch {
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
          // Guard: ignore subsequent callbacks while a validation is in progress.
          if (busyRef.current) return;
          busyRef.current = true;
          try {
            await scanner.stop().catch(() => {});
            scannerRef.current = null;
            setScanning(false);
            await validate(decoded);
          } finally {
            busyRef.current = false;
          }
        },
        () => {},
      );
      // Only assign the ref and mark scanning after start() succeeds.
      scannerRef.current = scanner;
      setScanning(true);
    } catch {
      // start() failed: clean up the scanner instance before bailing out.
      await scanner.stop().catch(() => {});
      scannerRef.current = null;
      setScanning(false);
      setError('No se pudo abrir la cámara. Usa la entrada manual.');
    }
  }

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  async function logout() {
    await api('/commerce/logout', { method: 'POST' });
    router.push('/comercio/ingresar');
  }

  if (!ready) return <main className="p-6">Cargando…</main>;

  return (
    <main className="mx-auto mt-10 max-w-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Validar credencial</h1>
        <button className="rounded bg-gray-200 px-3 py-1 text-sm" onClick={logout}>Salir</button>
      </div>

      <div id="qr-reader" className="w-full" />
      <button
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
        onClick={startScan}
        disabled={scanning}
      >
        Escanear con cámara
      </button>

      <form onSubmit={(e) => { e.preventDefault(); validate(manual); }} className="space-y-2">
        <input className="w-full rounded border p-2" placeholder="…o pega el token / URL de la credencial"
          value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="w-full rounded border p-2" type="submit">Validar manualmente</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-xl border p-4">
          <p className="text-lg font-semibold">{result.student.nombreCompleto}</p>
          <p className="text-sm">Nivel: <b>{result.student.nivel}</b></p>
          <p className="mt-2 text-2xl font-bold text-green-600">Aplicar {result.porcentajeDescuento}% de descuento</p>
        </div>
      )}
    </main>
  );
}
