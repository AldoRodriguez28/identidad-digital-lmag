# PROJECT BRIEF — Plataforma Identidad Digital Juvenil (clon funcional)

> Este documento es la fuente de verdad del proyecto. Léelo completo antes de generar
> cualquier código. Basado en auditoría en vivo del sistema de referencia
> (https://tjuventud.epsomsegura.com/) realizada el 20 de julio de 2026.

## 1. Qué estamos construyendo
Plataforma de identidad digital juvenil para un municipio: los jóvenes se registran con
datos personales + INE + CURP, obtienen una "credencial digital", acumulan puntos por
participar en eventos/programas, y acceden a becas, descuentos, educación, deporte,
cultura y emprendimiento. Incluye panel de administración para el personal municipal.

## 2. Stack decidido (NO replicar el stack del sitio de referencia)
El sitio original usa Laravel + Livewire (monolito PHP). Nosotros construimos con:

- **Backend**: NestJS + PostgreSQL
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Auth**: sesión de servidor (no JWT innecesario) — sesión en Postgres o Redis,
  cookie httpOnly, incluir "remember me"
- **Storage de archivos** (INE frente/reverso, fotos de eventos): Cloudflare R2
  (S3-compatible)
- **Email transaccional**: Resend
- **Hosting objetivo**: Railway (o VPS si se decide lo contrario — confirmar antes de
  scaffolding)
- **PWA**: instalable en iOS/Android (manifest.json + service worker vía
  @ducanh2912/next-pwa + meta tags específicos de Safari)
- **OCR de INE** (feature nueva, no existe en el original): Claude API (Haiku 4.5),
  prompt de extracción estructurada a JSON, con verificación cruzada contra el CURP
  capturado manualmente en el formulario

## 3. Roles de usuario
- **Estudiante/joven**: se registra, tiene perfil, acumula puntos, ve su credencial
- **Gestor**: rol administrativo intermedio (visto en el sistema original, sin detalle
  de permisos confirmado — preguntar al cliente el alcance exacto)
- **Administrador**: control total del panel

## 4. Módulos — lado estudiante (público autenticado)

| Módulo | Función |
|---|---|
| Registro | Datos personales, domicilio, contacto, redes sociales, escolaridad, INE (frente/reverso), CURP |
| Login | Email + password, checkbox "mantener sesión iniciada" |
| Perfil | Nivel, puntos acumulados, barra de progreso al siguiente nivel, datos personales editables, intereses (multi-select), redes sociales |
| Mis Puntos | Sistema de niveles: Bronce (0-500), Plata (501-1500), Oro (1501-3000), Diamante (3000+), con beneficios distintos por nivel, historial de movimientos, estadísticas (eventos asistidos, talleres completados) |
| Eventos | Catálogo por categoría (deportivo/cultural/talleres), cada uno otorga puntos (ej. 350 pts) al asistir, código QR propio para check-in, opción de que el estudiante proponga su propio evento |
| Beneficios | Directorio de comercios afiliados con % de descuento |
| Emprendimiento | Catálogo de talleres (convenio tipo ICATVER), con precio, horario, modalidad, y registro |
| Educación | Directorio de universidades/oferta académica, filtrable |
| Deporte | Try-outs / becas deportivas con equipos afiliados, flujo de postulación de varios pasos |
| Cultura | Programas artísticos (banda, danza, conservatorio) con becas |
| Credencial digital | Página tipo `/{PREFIJO}_{CURP}` que muestra nombre, nivel, edad, escolaridad, colonia, intereses, redes — **IMPORTANTE: en el original esta ruta parece accesible SIN LOGIN. Es una vulnerabilidad de exposición de datos personales por URL predecible/enumerable. En nuestro clon: exigir autenticación o un token de verificación no adivinable (no basado en CURP plano) para acceder a esta vista pública.**

## 5. Módulos — panel de administración

| Módulo | Función |
|---|---|
| Dashboard (Inicio) | Conteo de usuarios por tipo, top 5 intereses más elegidos |
| Usuarios de la plataforma | CRUD de cuentas internas, roles Administrador/Gestor |
| Usuarios estudiantes | CRUD de jóvenes registrados, vista detalle completa incluyendo documentos INE |
| Catálogo de intereses | CRUD de categorías e intereses, paginado |
| Mi perfil | Editar datos propios de administrador |

> **Gap detectado en el sistema original**: no se encontró panel admin para gestionar
> becas/descuentos/eventos/emprendimiento/educación/deporte/cultura — ese contenido
> existe del lado del estudiante pero no se confirmó quién lo administra ni cómo.
> **Decisión pendiente con el cliente**: ¿estos catálogos deben ser administrables
> desde el panel en nuestro clon, o se mantienen semi-estáticos? Recomendación: sí
> hacerlos administrables (CRUD) para que el cliente no dependa de un desarrollador
> para actualizar contenido.

## 6. Modelo de datos — Estudiante
```
Estudiante {
  nombre_completo, fecha_nacimiento, curp, sexo, escolaridad,
  año_vigencia_credencial,
  correo, telefono,
  domicilio: { calle, colonia, codigo_postal, num_ext, num_int, entre_calles },
  redes: { facebook, instagram, tiktok, whatsapp },
  intereses: [Interes] (many-to-many),
  ine_frente: archivo, ine_reverso: archivo,
  nivel: enum(bronce, plata, oro, diamante),
  puntos_acumulados: int,
  password (hash)
}
```

## 7. Seguridad y cumplimiento (no negociable dado el tipo de dato)
- INE y CURP son datos sensibles de un padrón municipal → aplica la Ley General de
  Protección de Datos Personales en Posesión de Sujetos Obligados
- Cifrar en reposo las imágenes de INE, o al menos restringir su acceso solo a
  administradores autenticados con permiso explícito
- La ruta de credencial pública NO debe exponer datos sin autenticación/token seguro
  (ver punto 4)
- Cookies de sesión httpOnly + secure
- Si se usa la API de Claude para OCR de INE, declarar el uso de un proveedor externo
  de IA en el aviso de privacidad

## 8. Fuera de alcance / preguntar al cliente antes de construir
- ¿Existe panel para comercios afiliados (para que ellos mismos validen el descuento)?
- ¿Se requiere recuperación de contraseña? (no existía en el original)
- ¿Los catálogos de becas/eventos/comercios deben ser administrables desde el día 1?
- ¿Migración de datos del sistema actual, o arranca en cero?

## 9. Orden de construcción sugerido
1. Infraestructura base: auth, roles, esquema de BD
2. Registro + login + perfil de estudiante
3. Panel admin (usuarios, estudiantes, catálogo de intereses)
4. Sistema de puntos/niveles
5. Eventos + QR check-in
6. Beneficios / Emprendimiento / Educación / Deporte / Cultura (catálogos + registro)
7. Credencial digital (con el fix de seguridad aplicado)
8. PWA
9. OCR de INE (Claude API)
10. Hardening, backups, despliegue
