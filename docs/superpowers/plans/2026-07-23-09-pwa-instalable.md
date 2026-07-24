# Plan 09 — PWA instalable (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer la app web instalable como PWA en iOS/Android (manifest + íconos + meta tags + service worker) y que la credencial digital del joven funcione sin conexión.

**Architecture:** Enfoque nativo de Next 16 (sin librería PWA): `app/manifest.ts` para el Web App Manifest y la Metadata/viewport API para los meta tags de instalación; más un service worker mínimo escrito a mano (`public/sw.js`, JS plano sin Workbox) registrado desde un client component. El SW hace la app instalable y cachea la credencial (`/c/*`: página + JSON de la API) y los chunks `/_next/static/*` con estrategias distintas, dejando fuera las rutas autenticadas.

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack), React 19, TypeScript, `sharp` (ya instalado, solo para generar íconos placeholder). Node 20.

## Global Constraints

- **NO usar `@ducanh2912/next-pwa` ni `@serwist/next`.** Son plugins de webpack incompatibles con Turbopack de Next 16. Se usa manifest nativo + SW a mano (decisión del spec §2).
- **Node 20 obligatorio:** `nvm use 20.19.1` antes de cualquier npm/npx. Todos los comandos de este plan corren desde `web/`.
- **`web/AGENTS.md`:** esta versión de Next difiere del conocimiento previo; ante cualquier duda de API de Next, consultar `web/node_modules/next/dist/docs/`.
- **`web/` no tiene framework de pruebas** (patrón del repo: verificación por `npm run build` + comprobaciones de archivos + manual). No introducir uno.
- **Colores de marca (placeholder):** `theme_color` y monograma en negro `#000000`, `background_color` blanco `#ffffff`, monograma "ID" en blanco. Fácilmente reemplazables.
- **Íconos requeridos:** `icon-192.png` (192×192), `icon-512.png` (512×512), `icon-512-maskable.png` (512×512, maskable), `apple-touch-icon.png` (180×180). En `web/public/icons/`.
- **Regla de caché del SW (privacidad):** el SW solo cachea `/c/*` (credencial, pública-por-token) y `/_next/static/*` (código sin PII) y la página `/offline`. **Nunca** cachea `/students/me/*`, `/admin/*`, `/auth/*` ni navegaciones autenticadas.
- **`lang` del `<html>`** pasa de `"en"` a `"es"`.
- **Commits:** uno por tarea, con línea final `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `web/src/app/manifest.ts` (crear) — Web App Manifest vía `MetadataRoute.Manifest`.
- `web/scripts/generate-icons.mjs` (crear) — script one-off (sharp) que genera los PNGs placeholder.
- `web/public/icons/*.png` (crear, committear) — íconos generados.
- `web/src/app/layout.tsx` (modificar) — metadata + viewport + `lang="es"` (Task 2) y montaje del registro del SW (Task 3).
- `web/src/app/offline/page.tsx` (crear) — página de respaldo offline.
- `web/public/sw.js` (crear) — service worker.
- `web/src/app/sw-register.tsx` (crear) — client component que registra el SW.

---

### Task 1: Manifest + íconos placeholder

**Files:**
- Create: `web/src/app/manifest.ts`
- Create: `web/scripts/generate-icons.mjs`
- Create: `web/public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` (generados por el script)

**Interfaces:**
- Consumes: `sharp` (ya en `web/node_modules`).
- Produces:
  - `/manifest.webmanifest` (Next lo sirve desde `manifest.ts`) con `name`, `short_name`, `display:"standalone"`, `theme_color`, `background_color`, e `icons` [192, 512, 512-maskable].
  - Los 4 archivos PNG en `web/public/icons/` (servidos como `/icons/<archivo>`).

- [ ] **Step 1: Crear el manifest**

`web/src/app/manifest.ts`:
```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Identidad Digital Juvenil',
    short_name: 'Identidad',
    description: 'Tu credencial digital juvenil: puntos, eventos y beneficios.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

- [ ] **Step 2: Crear el script generador de íconos**

`web/scripts/generate-icons.mjs`:
```js
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// SVG placeholder: cuadrado negro (redondeado o full-bleed) con monograma "ID" blanco.
function svg({ size, fontRatio, radiusRatio }) {
  const r = Math.round(size * radiusRatio);
  const fontSize = Math.round(size * fontRatio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#000000"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-weight="700"
      font-size="${fontSize}" fill="#ffffff">ID</text>
  </svg>`;
}

async function gen(name, opts) {
  await sharp(Buffer.from(svg(opts))).png().toFile(join(outDir, name));
  console.log('wrote', name);
}

// any: esquinas redondeadas (18%), monograma grande (50%).
await gen('icon-192.png', { size: 192, fontRatio: 0.5, radiusRatio: 0.18 });
await gen('icon-512.png', { size: 512, fontRatio: 0.5, radiusRatio: 0.18 });
// maskable: full-bleed (radius 0) + monograma dentro de la safe-zone (~36%).
await gen('icon-512-maskable.png', { size: 512, fontRatio: 0.36, radiusRatio: 0 });
// apple-touch: full-bleed, sin transparencia (iOS enmascara las esquinas).
await gen('apple-touch-icon.png', { size: 180, fontRatio: 0.5, radiusRatio: 0 });
```

- [ ] **Step 3: Ejecutar el script y generar los PNGs**

Run: `cd web && nvm use 20.19.1 && node scripts/generate-icons.mjs`
Expected: imprime `wrote icon-192.png` … `wrote apple-touch-icon.png`; los 4 PNGs existen en `web/public/icons/`.

- [ ] **Step 4: Verificar dimensiones y que el monograma se rasterizó**

Run:
```bash
cd web && node -e "const s=require('sharp');for(const f of ['icon-192','icon-512','icon-512-maskable']){s('public/icons/'+f+'.png').metadata().then(m=>console.log(f,m.width+'x'+m.height))}; s('public/icons/apple-touch-icon.png').metadata().then(m=>console.log('apple',m.width+'x'+m.height))"
```
Expected: `icon-192 192x192`, `icon-512 512x512`, `icon-512-maskable 512x512`, `apple 180x180`.

Además, **abre `web/public/icons/icon-512.png` y confirma visualmente** que se ve el cuadrado negro con "ID" en blanco. Si el texto NO aparece (el rasterizador SVG de sharp no encontró fuente), es aceptable para un placeholder dejar el cuadrado negro sólido; anótalo como concern. No bloquea (los íconos siguen siendo PNGs válidos e instalables).

- [ ] **Step 5: Verificar el build y la ruta del manifest**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; en la lista de rutas aparece `/manifest.webmanifest`.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/manifest.ts web/scripts/generate-icons.mjs web/public/icons
git commit -m "feat(web): add PWA manifest and placeholder icons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Metadata/viewport + página offline

**Files:**
- Modify: `web/src/app/layout.tsx`
- Create: `web/src/app/offline/page.tsx`

**Interfaces:**
- Consumes: nada de tareas previas (el manifest de Task 1 lo enlaza Next automáticamente).
- Produces:
  - `metadata` con `applicationName`, `title`, `description`, `appleWebApp`, `icons.apple`; export `viewport` con `themeColor` + `width/initialScale`; `<html lang="es">`.
  - Ruta `/offline` (página estática de respaldo, sin llamadas a la API), usada por el SW en Task 3.

- [ ] **Step 1: Reescribir el metadata del layout raíz**

Reemplaza el contenido de `web/src/app/layout.tsx` por (conserva las fuentes Geist y `globals.css` existentes; cambia `lang`, `metadata` y añade `viewport`):
```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Identidad Digital Juvenil",
  title: "Identidad Digital Juvenil",
  description: "Tu credencial digital juvenil: puntos, eventos y beneficios.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Identidad" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Crear la página offline**

`web/src/app/offline/page.tsx`:
```tsx
export const metadata = { title: 'Sin conexión' };

export default function OfflinePage() {
  return (
    <main className="mx-auto mt-16 max-w-sm p-6 text-center">
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="mt-2 text-sm text-gray-600">
        No tienes conexión a internet. Revisa tu red e intenta de nuevo.
        Tu credencial digital sigue disponible si ya la habías abierto.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Verificar el build y las rutas**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK; `/offline` aparece en la lista de rutas; sin errores de tipo por `Metadata`/`Viewport`.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/layout.tsx web/src/app/offline
git commit -m "feat(web): add PWA metadata, viewport theme-color and offline page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Service worker + registro

**Files:**
- Create: `web/public/sw.js`
- Create: `web/src/app/sw-register.tsx`
- Modify: `web/src/app/layout.tsx` (montar `<ServiceWorkerRegister />`)

**Interfaces:**
- Consumes: la ruta `/offline` (Task 2), los íconos y el manifest (Task 1).
- Produces:
  - `/sw.js` (servido estático desde `public/`) con estrategias: `/c/*` network-first+caché, `/_next/static/*` cache-first, navegaciones → `/offline` en fallo.
  - `<ServiceWorkerRegister />` montado en el layout: registra `/sw.js` en el cliente. Esto completa la instalabilidad (Chrome exige un SW con handler `fetch`).

- [ ] **Step 1: Escribir el service worker**

`web/public/sw.js`:
```js
const CACHE = 'idj-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Credencial (página same-origin /c/<token> Y JSON cross-origin {API}/c/<token>):
  // network-first, cachea GET OK, cae a caché offline.
  if (url.pathname.startsWith('/c/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Chunks de build inmutables: cache-first (necesario para que la credencial hidrate offline).
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  // Otras navegaciones: network-first; si falla la red, página offline. No se cachea (evita
  // guardar páginas autenticadas).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Resto: passthrough (SW mínimo).
});
```

- [ ] **Step 2: Escribir el client component de registro**

`web/src/app/sw-register.tsx`:
```tsx
'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Montar el registro en el layout**

En `web/src/app/layout.tsx`, importa el componente y móntalo dentro de `<body>` junto a `{children}`:
```tsx
import ServiceWorkerRegister from "./sw-register";
```
Y cambia el `<body>` a:
```tsx
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
```

- [ ] **Step 4: Verificar el build**

Run: `cd web && nvm use 20.19.1 && npm run build`
Expected: build OK, sin errores de tipo. (`public/sw.js` es un asset estático; no lo procesa el bundler.)

- [ ] **Step 5: Verificación manual de instalabilidad + offline**

Levanta la app en modo producción y comprueba los artefactos y el flujo (con la API viva para poder cargar una credencial):
```bash
cd web && nvm use 20.19.1 && npm run build && npm start
# En otra terminal:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sw.js            # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/icons/icon-192.png # 200
curl -s http://localhost:3000/manifest.webmanifest | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const m=JSON.parse(d);console.log('display',m.display,'| icons',m.icons.length,'| name',m.name)})"
# Esperado: display standalone | icons 3 | name Identidad Digital Juvenil
```
Luego, en Chrome (con la API corriendo para cargar datos):
1. Abre `http://localhost:3000` → DevTools → **Application → Manifest**: sin errores, botón/estado "installable"; **Service Workers**: `sw.js` activado.
2. Inicia sesión como un joven y abre su credencial `/c/<token>` (o abre una credencial válida directamente). Confirma que carga.
3. DevTools → **Network → Offline** → recarga `/c/<token>`: la credencial y el **QR** se muestran desde caché.
4. Estando offline, navega a una ruta autenticada (p. ej. `/panel`): debe mostrar la página `/offline` (no datos cacheados).
5. (Opcional) Lighthouse → categoría PWA → "installable" pasa.

Expected: instalable, SW activo, credencial+QR offline desde caché, rutas autenticadas caen a `/offline`.

- [ ] **Step 6: Commit**

```bash
git add web/public/sw.js web/src/app/sw-register.tsx web/src/app/layout.tsx
git commit -m "feat(web): add service worker with offline credential support and registration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (Plan 09 vs design §3-7):**
- Manifest válido (nombre, íconos 192/512/maskable, standalone, colores): Task 1 (`manifest.ts` + íconos). ✅
- Meta tags iOS + theme-color (Metadata/viewport API): Task 2 (`layout.tsx`). ✅
- SW registrado que hace instalable la app: Task 3 (`sw.js` + `sw-register.tsx` montado). ✅
- Offline: app shell + `/offline` + credencial (`/c/*` página+API) + chunks `/_next/static/*`: Task 2 (`/offline`) + Task 3 (reglas del SW). ✅
- Íconos placeholder generados (reemplazables): Task 1 (`generate-icons.mjs`). ✅
- Exclusión de rutas autenticadas del caché (privacidad §7): regla del SW en Task 3 (solo `/c/*` y `/_next/static/*`; navegaciones no se cachean). ✅
- No usar next-pwa/serwist (§2): ninguna tarea añade esas deps; SW a mano. ✅

**Placeholder scan:** sin TBD/TODO. La única condicionalidad ("si el texto no rasteriza…") es una ruta de aceptación explícita para un placeholder, no un pendiente.

**Type consistency:** el nombre de caché `CACHE = 'idj-v1'` se usa consistente en `install`/`activate`/`fetch`. `OFFLINE_URL = '/offline'` coincide con la ruta creada en Task 2. El componente `ServiceWorkerRegister` (default export de `sw-register.tsx`) se importa y monta con ese mismo nombre en el layout (Task 3). Los paths de íconos en `manifest.ts` (`/icons/icon-192.png`, etc.) coinciden con los archivos que genera `generate-icons.mjs` y con la verificación por `curl`. `appleWebApp.title` "Identidad" == `short_name`. `theme_color`/`themeColor` == `#000000` en manifest y viewport.

**Seguridad:** el SW nunca cachea `/students/me/*`, `/admin/*`, `/auth/*` (no matchean `/c/*` ni `/_next/static/*`, y las navegaciones no se cachean); solo cachea la credencial pública-por-token y código sin PII. El modelo de sesión (cookie httpOnly) no cambia.

## Próximos planes
- **10** — Hardening + despliegue. **RELEASE-BLOCKER vigente:** cifrado en reposo del INE + restricción R2; CORS allowlist por env; purga de sesiones expiradas; adaptadores R2/Resend. La PWA requiere **HTTPS** en producción para registrar el SW (implícito en el hosting).
