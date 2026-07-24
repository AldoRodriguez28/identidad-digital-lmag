# Diseño — Plan 09: PWA instalable

> Sub-proyecto del MVP Identidad Digital Juvenil. Deriva de la spec maestra
> `2026-07-20-mvp-identidad-digital-design.md` §3.1 #11 y del brief (CLAUDE.md §2 "PWA").
> Fecha: 2026-07-23. Sigue a Plan 08 (talleres + bolsa de trabajo, completo).

## 1. Objetivo

Convertir la app web en una **PWA instalable** en iOS y Android: que el joven pueda
"agregar a la pantalla de inicio", que abra en modo standalone (sin barra del navegador),
y que su **credencial digital funcione sin conexión** para mostrarla (con su QR) en un
evento aunque no haya señal.

## 2. Decisión de arquitectura (importante — se desvía del spec)

El brief/spec sugería `@ducanh2912/next-pwa`. **No lo usamos.** Esa librería es un plugin de
**webpack** (`peerDependencies.webpack >=5.9.0`) y el proyecto corre **Next.js 16.2.10 con
Turbopack**; el plugin no se ejecuta bajo Turbopack (obligaría a abandonar Turbopack o
rompería el build). Su sucesor mantenido, `@serwist/next`, también inyecta en webpack y
requiere `@serwist/cli`, con compatibilidad Turbopack incierta.

**Enfoque elegido:** funciones **nativas de Next 16** (`app/manifest.ts` + Metadata/viewport
API) para el manifest y los meta tags, más un **service worker mínimo escrito a mano**
(`public/sw.js`, JavaScript plano sin Workbox). Esto es 100% compatible con Turbopack, sin
dependencias PWA nuevas, y suficiente para instalabilidad + el offline requerido.

> Confirmado con el cliente en brainstorming: enfoque nativo + SW a mano; offline = app
> shell + página offline + **credencial**; íconos = placeholders generados ahora.

## 3. Alcance

### Dentro (v1)
- Web App Manifest válido (nombre, íconos 192/512/maskable, `display: standalone`, colores).
- Meta tags de instalación iOS (Safari `apple-mobile-web-app-*`, apple-touch-icon) y
  `theme-color`, vía la Metadata/viewport API de Next.
- Service worker registrado que hace la app instalable (prompt de instalación en Chrome/Android
  requiere un SW con handler `fetch`) y da soporte offline.
- **Offline:** app shell + página de respaldo `/offline`; y la **credencial** (`/c/<token>`,
  página + datos de la API) que el joven ya visitó, servida desde caché sin conexión.
- Íconos placeholder generados (reemplazables por los de marca).

### Fuera (v1) — explícito
- Notificaciones push, background sync, periodic sync.
- Navegación offline de catálogos completos (eventos/beneficios/talleres/vacantes).
- Empaquetado a App Store / Play Store (TWA/Capacitor).
- Caché de rutas autenticadas (panel, perfil, mis-puntos) — **excluidas a propósito** por
  privacidad (datos personales/INE en dispositivo compartido).

## 4. Componentes

### 4.1 Manifest — `web/src/app/manifest.ts`
Función que devuelve `MetadataRoute.Manifest` (Next lo sirve en `/manifest.webmanifest` e
inyecta el `<link rel="manifest">` automáticamente):
```
name: "Identidad Digital Juvenil"
short_name: "Identidad"
description: "Tu credencial digital juvenil: puntos, eventos y beneficios."
start_url: "/"
scope: "/"
display: "standalone"
orientation: "portrait"
lang: "es"
background_color: "#ffffff"
theme_color: "#000000"
icons: [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
]
```

### 4.2 Íconos — `web/public/icons/` + `web/scripts/generate-icons.mjs`
Script one-off (Node ESM, usa **sharp**, ya instalado en `web/`) que genera PNGs placeholder:
un cuadrado negro con esquinas redondeadas y el monograma "ID" en blanco centrado. Genera:
- `icon-192.png` (192×192), `icon-512.png` (512×512)
- `icon-512-maskable.png` (512×512, monograma dentro del ~80% central para la safe-zone)
- `apple-touch-icon.png` (180×180, sin transparencia, fondo negro)

Los archivos PNG se **committean** en `web/public/icons/` (assets estáticos; el script queda
en el repo para regenerarlos). Son placeholders; se reemplazan por los de marca cambiando los
archivos.

### 4.3 Metadata / meta tags — `web/src/app/layout.tsx` (modificar)
Reemplazar el `metadata` boilerplate ("Create Next App") por:
```ts
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
```
Next emite desde `appleWebApp` los `apple-mobile-web-app-capable`, `-status-bar-style` y
`-title`, y desde `viewport.themeColor` el `<meta name="theme-color">`. `lang` del `<html>`
pasa de `"en"` a `"es"`.

### 4.4 Service worker — `web/public/sw.js`
JavaScript plano (sin build step; servido estático en `/sw.js`, scope raíz). Nombre de caché
versionado `idj-v1`.
- **`install`:** `caches.open('idj-v1')` y precachea `['/offline']`; `self.skipWaiting()`.
- **`activate`:** borra cachés cuyo nombre ≠ `idj-v1`; `self.clients.claim()`.
- **`fetch`** (solo GET; ignora otros métodos):
  - Si `url.pathname` empieza con `/c/` (cubre la **página** same-origin `/c/<token>` y la
    **API** cross-origin `{API}/c/<token>`, ambas con ese pathname): **network-first** — intenta
    red, si responde OK clona y guarda en `idj-v1`, y devuelve; si la red falla, devuelve la
    respuesta cacheada si existe. ⇒ credencial + QR offline.
  - Si es un **asset de build** same-origin (`url.pathname` empieza con `/_next/static/`):
    **cache-first** — devuelve de caché si existe, si no va a la red y guarda la respuesta. Estos
    chunks tienen hash de contenido (inmutables), así que es seguro. **Necesario** para que la
    página client-side de la credencial (React + `qrcode.react`) **hidrate y muestre el QR
    offline**; se cachean cuando el joven visita `/c/<token>` online.
  - Si es una **navegación** (`request.mode === 'navigate'`) a otra ruta: network-first; si la
    red falla, devuelve `caches.match('/offline')`. **No** cachea la respuesta (evita guardar
    páginas autenticadas).
  - Resto: passthrough a la red (SW mínimo).
- **No** intercepta ni cachea `/students/me/*`, `/admin/*`, `/auth/*` (no empiezan con `/c/` ni
  `/_next/static/`, y sus navegaciones no se cachean). Los chunks de `/_next/static/` son código
  compartido sin PII → cachearlos es seguro.

### 4.5 Registro del SW — `web/src/app/sw-register.tsx` (crear) + layout
Client component: en `useEffect`, si `'serviceWorker' in navigator`, registra `/sw.js`
(silencioso, `.catch` que ignora). Se monta una vez en `web/src/app/layout.tsx` dentro de
`<body>`. Sin UI.

### 4.6 Página offline — `web/src/app/offline/page.tsx` (crear)
Página estática simple: título "Sin conexión" y texto indicando que se reconecte; sin llamadas
a la API. Es el fallback de navegación del SW.

## 5. Flujo de datos (offline credencial)

1. Online, el joven abre `/c/<token>`. El SW cachea (a) la navegación de la página, (b) los
   chunks `/_next/static/*` que carga (React + `qrcode.react` + el chunk de la página), y (c) la
   respuesta JSON de la API `GET {API}/c/<token>` (regla `/c/*`).
2. Offline en el evento, abre la PWA en `/c/<token>`. La navegación falla en red → el SW sirve
   la página cacheada; los chunks se sirven de caché → la página **hidrata**. El `useEffect`
   llama a la API; falla en red → el SW sirve el JSON cacheado → se pintan nombre/nivel y el QR
   (que se genera de `window.location.href`, sin red).
3. Si nunca visitó esa credencial online, offline no hay caché → la página muestra su estado de
   error de red existente ("No se pudo cargar…"). Aceptable (v1).

## 6. Testing / verificación

`web/` no tiene framework de pruebas (patrón del repo: verificación por build + manual).
No se introduce uno (YAGNI). Verificación:
- `cd web && npm run build` → OK; la ruta `/manifest.webmanifest` aparece.
- Con `npm run build && npm start`: `curl -s localhost:3000/manifest.webmanifest` devuelve JSON
  con `name`, `display:"standalone"`, e `icons` incluyendo 192 y 512; `/sw.js` responde 200;
  `/icons/icon-192.png` responde 200.
- **Manual (PWA):** Chrome DevTools → Application → Manifest sin errores e "installable";
  Service Workers muestra `sw.js` activado. Lighthouse: PWA "installable" pasa.
- **Manual (offline credencial):** abrir un `/c/<token>` online; DevTools → Network → Offline;
  recargar → la credencial y el QR se muestran desde caché; una ruta autenticada muestra
  `/offline`.

## 7. Seguridad / privacidad

- El SW solo cachea `/c/*` (credencial, ya pública-por-token en el modelo del Plan 03) y la
  página `/offline`. **Nunca** cachea respuestas de rutas autenticadas ni datos de INE.
- Sin datos personales nuevos expuestos; el token no adivinable sigue siendo el control de
  acceso de la credencial.
- El manifest y el SW no cambian el modelo de auth (cookie httpOnly de sesión sigue igual).

## 8. Estructura de tareas (para el plan)

1. **Manifest + íconos** — `manifest.ts`, `scripts/generate-icons.mjs`, PNGs en `public/icons/`.
2. **Metadata/viewport + página offline** — reescribir `layout.tsx` (metadata, viewport, lang,
   montar el registro), crear `offline/page.tsx`.
3. **Service worker + registro** — `public/sw.js`, `sw-register.tsx`; build + verificación
   manual de instalabilidad y offline.

## 9. Próximos planes (post-09)
- **10** — Hardening + despliegue. **RELEASE-BLOCKER vigente:** cifrado en reposo del INE +
  restricción R2; CORS allowlist por env; purga de sesiones expiradas; adaptadores R2/Resend.
  (En despliegue, la PWA requiere **HTTPS** para que el SW se registre — ya implícito en el hosting.)
