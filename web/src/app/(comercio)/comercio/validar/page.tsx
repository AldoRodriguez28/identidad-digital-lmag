'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, BadgePercent, CheckCircle2, Receipt, RotateCcw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../../../lib/api';
import { CommerceShell } from '../../../../components/CommerceShell';

type Preview = { student: { nombreCompleto: string; nivel: string }; porcentajeDescuento: number };
type Done = Preview & { monto: number; descuento: number; montoFinal: number };

function extractToken(value: string): string {
  const trimmed = value.trim();
  const idx = trimmed.lastIndexOf('/c/');
  if (idx >= 0) return trimmed.slice(idx + 3).split(/[/?#]/)[0];
  return trimmed;
}

const inputCls = 'w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-guinda focus:ring-2 focus:ring-guinda/15';

export default function ComercioValidarPage() {
  const [manual, setManual] = useState('');
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [monto, setMonto] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  function reset() { setToken(''); setPreview(null); setMonto(''); setDone(null); setError(''); setManual(''); }

  async function validate(rawValue: string) {
    setError(''); setPreview(null); setDone(null);
    const credentialToken = extractToken(rawValue);
    if (!credentialToken) { setError('Token vacío.'); return; }
    try {
      const res = await api('/commerce/validate', { method: 'POST', body: JSON.stringify({ credentialToken }) });
      if (!mountedRef.current) return;
      if (res.ok) { setPreview(await res.json()); setToken(credentialToken); }
      else if (res.status === 404) setError('Credencial no encontrada.');
      else setError('No se pudo validar.');
    } catch { if (mountedRef.current) setError('No se pudo conectar con el servidor.'); }
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const m = Number(monto);
    if (!Number.isFinite(m) || m < 0) { setError('Ingresa un monto válido.'); return; }
    try {
      const res = await api('/commerce/purchase', { method: 'POST', body: JSON.stringify({ credentialToken: token, monto: Math.round(m * 100) / 100 }) });
      if (!mountedRef.current) return;
      if (res.ok) { setDone(await res.json()); setPreview(null); }
      else setError('No se pudo registrar la compra.');
    } catch { if (mountedRef.current) setError('No se pudo conectar con el servidor.'); }
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
            await validate(decoded);
          } finally { busyRef.current = false; }
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

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; scannerRef.current?.stop().catch(() => {}); };
  }, []);

  return (
    <CommerceShell>
      <h1 className="text-2xl font-extrabold uppercase tracking-tight text-guinda">Validar credencial</h1>
      <p className="mt-1 text-sm text-gray-500">Escanea el QR del joven, captura el monto de la cuenta y registra la compra.</p>

      <div className="mt-5 space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        {/* Paso 1: escanear (oculto cuando ya hay preview o done) */}
        {!preview && !done && (
          <>
            <div id="qr-reader" className="w-full overflow-hidden rounded-xl" />
            <button onClick={startScan} disabled={scanning} className="flex w-full items-center justify-center gap-2 rounded-full bg-guinda px-5 py-3 text-sm font-bold text-white hover:bg-guinda-700 disabled:opacity-50">
              <Camera size={16} />Escanear con cámara
            </button>
            <form onSubmit={(e) => { e.preventDefault(); validate(manual); }} className="space-y-2">
              <input className={inputCls} placeholder="…o pega el token / URL de la credencial" value={manual} onChange={(e) => setManual(e.target.value)} />
              <button type="submit" className="w-full rounded-full border border-guinda/25 px-5 py-2.5 text-sm font-semibold text-guinda hover:bg-guinda/5">Consultar manualmente</button>
            </form>
          </>
        )}

        {/* Paso 2: capturar monto */}
        {preview && (
          <div className="space-y-4">
            <div className="rounded-xl bg-guinda/5 p-4 text-center">
              <p className="text-lg font-bold text-ink">{preview.student.nombreCompleto}</p>
              <p className="text-sm capitalize text-gray-600">Nivel: <b>{preview.student.nivel}</b></p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-guinda"><BadgePercent size={16} />Descuento: {preview.porcentajeDescuento}%</p>
            </div>
            <form onSubmit={registrar} className="space-y-3">
              <label className="block text-sm font-semibold text-ink">Monto de la cuenta</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-400">$</span>
                <input className={inputCls} type="number" min={0} step="0.01" inputMode="decimal" autoFocus placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} required />
              </div>
              {monto !== '' && Number(monto) >= 0 && (() => {
                const m = Number(monto);
                const desc = Math.round(m * preview.porcentajeDescuento) / 100;
                return (
                  <p className="text-sm text-gray-500">
                    Descuento: <b className="text-guinda">${desc.toFixed(2)}</b> · Total a cobrar: <b className="text-ink">${(m - desc).toFixed(2)}</b>
                  </p>
                );
              })()}
              <div className="flex gap-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-bold text-white hover:bg-guinda-700"><Receipt size={16} />Registrar compra</button>
                <button type="button" onClick={reset} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-black/5">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Paso 3: confirmación */}
        {done && (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wide text-success"><CheckCircle2 size={16} />Compra registrada</p>
              <p className="mt-2 text-lg font-bold text-ink">{done.student.nombreCompleto}</p>
              <dl className="mx-auto mt-3 max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Monto</dt><dd className="font-semibold text-ink">${done.monto.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Descuento ({done.porcentajeDescuento}%)</dt><dd className="font-semibold text-guinda">−${done.descuento.toFixed(2)}</dd></div>
                <div className="flex justify-between border-t border-black/10 pt-1"><dt className="font-semibold text-ink">Total a cobrar</dt><dd className="text-lg font-extrabold text-success">${done.montoFinal.toFixed(2)}</dd></div>
              </dl>
            </div>
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-guinda px-5 py-2.5 text-sm font-bold text-white hover:bg-guinda-700"><RotateCcw size={16} />Nueva venta</button>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </CommerceShell>
  );
}
