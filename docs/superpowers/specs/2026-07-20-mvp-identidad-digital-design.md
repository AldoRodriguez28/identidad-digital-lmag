# Diseño MVP (v1 productiva) — Plataforma Identidad Digital Juvenil

- **Fecha:** 2026-07-20
- **Fuente de verdad del producto completo:** `CLAUDE.md` (auditoría del sistema de referencia)
- **Este documento:** define el **primer corte productivo (v1)** a desplegar en producción, no el producto completo.

## 1. Objetivo

Salir a producción con una plataforma **usable de verdad** por jóvenes reales del municipio,
lo antes posible, cubriendo el flujo núcleo: registrarse → tener credencial digital →
acumular puntos por asistir a eventos → usar beneficios en comercios afiliados. El personal
municipal administra el contenido desde un panel. Se difiere lo vistoso-pero-no-núcleo (OCR,
módulos Educación/Deporte/Cultura, inscripciones internas) a la v2.

## 2. Roles (4)

| Rol | Puede |
|---|---|
| **Estudiante/joven** | Registrarse, editar perfil, ver credencial/puntos, ver catálogos (eventos, comercios, talleres, vacantes). |
| **Comercio** | Iniciar sesión y **escanear el QR de la credencial del joven** para validar y aplicar descuento. Nada más. |
| **Gestor** | Administrar **todo el contenido** (estudiantes, intereses, eventos, comercios, talleres, vacantes) y operar check-in de eventos. **NO** gestiona cuentas internas ni roles. |
| **Administrador** | Todo lo del Gestor **+** CRUD de cuentas internas (Admin/Gestor) y cuentas de Comercio. |

## 3. Alcance de la v1

### 3.1 Lado estudiante
1. **Registro (auto-registro público)** — el joven **se da de alta él mismo**, sin intervención
   de un admin, desde un formulario público. Captura datos personales, domicilio, contacto, redes
   sociales, escolaridad, CURP, INE frente/reverso como **subida de archivo simple (sin OCR)**.
   Password hasheado (argon2/bcrypt). La cuenta queda **activa de inmediato** (sin verificación de
   email ni aprobación del municipio en v1); al crearse se le asigna nivel Bronce, 0 puntos y su
   `credential_token`.
2. **Login** — email + password, checkbox "mantener sesión iniciada".
3. **Recuperación de contraseña** — flujo "olvidé mi contraseña" con enlace de un solo uso
   por email vía **Resend** (token con expiración).
4. **Perfil** — nivel, puntos acumulados, barra de progreso al siguiente nivel, datos
   personales editables, intereses (multi-select), redes sociales.
5. **Puntos y niveles** — Bronce (0–500), Plata (501–1500), Oro (1501–3000), Diamante (3000+);
   historial de movimientos; estadísticas (eventos asistidos).
6. **Eventos + QR check-in** — catálogo por categoría (deportivo/cultural/talleres); al hacer
   check-in el estudiante recibe los puntos definidos en el evento.
7. **Beneficios/Comercios** — directorio de comercios afiliados con % de descuento; validación
   por escaneo del QR de la credencial (ver 3.4).
8. **Credencial digital** — página con nombre, nivel, edad, escolaridad, colonia, intereses,
   redes. **Fix de seguridad:** ruta por token no adivinable (ver 3.4), no por CURP plano.
9. **Cursos y talleres** — **solo catálogo informativo** (precio, horario, modalidad).
   Sin inscripción interna en v1.
10. **Bolsa de trabajo** — **directorio de vacantes** (puesto, empresa, requisitos, contacto).
    El joven ve y filtra; **aplica por fuera**. Sin postulación interna en v1.
11. **PWA instalable** — manifest.json + service worker (@ducanh2912/next-pwa) + meta tags Safari.

### 3.2 Panel admin/gestor (CRUD)
- **Estudiantes** — listar, ver detalle completo (incluye documentos INE), editar, eliminar.
- **Intereses** — CRUD, paginado.
- **Eventos** — CRUD + generación/gestión del check-in.
- **Comercios/beneficios** — CRUD + alta de la cuenta de acceso del comercio.
- **Cursos y talleres** — CRUD.
- **Vacantes (bolsa de trabajo)** — CRUD.
- **Dashboard básico** — conteo de usuarios por tipo, top intereses.
- **Usuarios internos** — CRUD de cuentas Admin/Gestor (**solo Administrador**).
- **Mi perfil** — editar datos propios.

### 3.3 Panel comercio
- Login de comercio.
- Pantalla de **escaneo del QR** de la credencial del joven → valida que existe/está activo,
  muestra nombre y nivel, y registra el uso del beneficio (para trazabilidad). Aplica descuento
  visualmente (el cobro real es fuera del sistema). **El uso de beneficio NO otorga puntos en v1.**

### 3.4 Mecanismo QR/token unificado (pieza central)
- Cada estudiante tiene un `credential_token` **no adivinable** (nanoid, ~21 chars), independiente
  del CURP, regenerable.
- La credencial pública vive en `/c/{credential_token}`. El QR de la credencial codifica ese token/URL.
- **Un solo componente de escaneo** cubre los tres casos, diferenciados por el rol del que escanea:
  - **Comercio** escanea → valida descuento y registra uso.
  - **Staff (Gestor/Admin) en un evento** escanea → registra asistencia y otorga puntos del evento.
  - **Cualquiera con el token** puede ver la credencial (acceso controlado por lo no-adivinable del token).
- Control de acceso: la vista de credencial se sirve solo con token válido; el escaneo con acción
  (descuento / check-in) exige además sesión autenticada del rol correspondiente.

## 4. Modelo de datos (entidades v1)

- **InternalUser** { email, password_hash, nombre, rol: enum(admin, gestor), activo }
- **Commerce** { nombre, descripcion, porcentaje_descuento, logo, email_login, password_hash, activo }
- **Student** { nombre_completo, fecha_nacimiento, curp, sexo, escolaridad, año_vigencia_credencial,
  correo, telefono, domicilio{calle, colonia, codigo_postal, num_ext, num_int, entre_calles},
  redes{facebook, instagram, tiktok, whatsapp}, ine_frente(archivo), ine_reverso(archivo),
  nivel: enum(bronce,plata,oro,diamante), puntos_acumulados: int, credential_token, password_hash }
- **Interest** { nombre } — M:N con Student vía **StudentInterest**.
- **Event** { titulo, descripcion, categoria, fecha, lugar, puntos_otorgados, activo }
- **EventCheckin** { event_id, student_id, fecha, otorgado_por(internal_user_id) } — otorga puntos (único por evento+estudiante).
- **BenefitUsage** { commerce_id, student_id, fecha } — trazabilidad de uso de descuento.
- **PointsMovement** { student_id, tipo(evento/ajuste), referencia, puntos, fecha } — historial; el nivel se recalcula.
- **Workshop** (cursos/talleres) { titulo, descripcion, precio, horario, modalidad, activo } — solo lectura para estudiante.
- **JobPosting** (vacante) { puesto, empresa, requisitos, contacto, activo } — solo lectura para estudiante.
- **Session** { id, user_ref, tipo_usuario, expires_at, remember } — sesión de servidor en Postgres.
- **PasswordReset** { user_ref, token, expires_at, used }.

> El nivel se deriva de `puntos_acumulados` según los umbrales; cada check-in de evento inserta un
> `PointsMovement` y recalcula nivel.

## 5. Arquitectura

- **Monorepo** con dos apps:
  - `api/` — **NestJS + PostgreSQL** (ORM: Prisma o TypeORM — decidir en el plan).
  - `web/` — **Next.js (App Router) + TypeScript + Tailwind**, con PWA.
- **Auth:** sesión de servidor, cookie **httpOnly + secure**, tabla de sesiones en Postgres,
  soporte "remember me" (expiración larga vs. corta). Sin JWT.
- **Storage de archivos INE / imágenes de eventos:** **Cloudflare R2** (S3-compatible), acceso
  a INE solo mediante URLs firmadas de corta duración emitidas a Admin/Gestor autenticados.
- **Email:** **Resend** (recuperación de contraseña; luego notificaciones).
- **Hosting:** **por confirmar antes del primer deploy** (Railway vs VPS). El código se desarrolla
  agnóstico al hosting (config por variables de entorno, sin acoplarse a APIs propietarias).
- **QR:** generación en el front (credencial) y lectura por cámara en las vistas de escaneo
  (comercio / staff de evento).

## 6. Seguridad y cumplimiento

- INE y CURP = datos sensibles de padrón municipal → aplica la Ley General de Protección de Datos
  Personales en Posesión de Sujetos Obligados.
- Imágenes de INE: acceso restringido a Admin/Gestor autenticados mediante URLs firmadas de corta
  duración; nunca públicas.
- Credencial: **solo** accesible por `credential_token` no adivinable; acciones (descuento/check-in)
  exigen sesión del rol correcto.
- Cookies de sesión httpOnly + secure; CSRF protegido en formularios.
- Passwords hasheadas (argon2id recomendado).
- Rate limiting en login y recuperación de contraseña.
- El aviso de privacidad debe declarar el uso de proveedor externo de IA **cuando** entre el OCR (v2).

## 7. Testing

- **API:** pruebas unitarias de servicios (puntos/niveles, tokens, permisos por rol) y de integración
  de los flujos núcleo (registro, login, reset password, check-in, uso de beneficio).
- **Autorización:** pruebas explícitas de que cada rol solo accede a lo permitido (p. ej. Gestor NO
  gestiona usuarios internos; Comercio solo escanea).
- **Seguridad de credencial:** prueba de que la vista NO es accesible sin token válido y que el token
  no deriva del CURP.
- **Web:** pruebas de componentes clave (formulario de registro, escaneo) y e2e del flujo núcleo.

## 8. Fuera de v1 (→ v2)

OCR de INE (Claude API) · módulos Educación, Deporte, Cultura · inscripción interna a talleres ·
postulación interna de empleo · propuesta de eventos por el estudiante · migración de datos
(la v1 **arranca en cero**) · panel/autoservicio para comercios más allá del escaneo.

## 9. Puntos abiertos (no bloquean el arranque)

- Hosting definitivo (Railway vs VPS) — confirmar antes del primer deploy.
- ORM concreto (Prisma vs TypeORM) — decidir en el plan de implementación.
- Umbral/beneficios exactos por nivel (más allá de los rangos de puntos) — el cliente puede afinarlos.
