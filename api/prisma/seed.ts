import { PrismaClient } from '@prisma/client';
import { argon2id } from 'hash-wasm';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@identidad.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Cambiar123!';

  const passwordHash = await argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'encoded',
  });

  // Idempotente: si el admin ya existe NO se re-hashea ni cambia su password. Cambiar SEED_ADMIN_PASSWORD y re-seedear NO actualiza la credencial existente (borrar el usuario para rotarla).
  await prisma.internalUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, nombre: 'Administrador', rol: 'admin' },
  });

  console.log(`Seed admin listo: ${email}`);

  const intereses: { nombre: string; categoria: 'deporte' | 'cultura' | 'arte' | 'tecnologia' }[] = [
    { nombre: 'Deporte', categoria: 'deporte' },
    { nombre: 'Música', categoria: 'cultura' },
    { nombre: 'Arte', categoria: 'arte' },
    { nombre: 'Tecnología', categoria: 'tecnologia' },
    { nombre: 'Emprendimiento', categoria: 'tecnologia' },
    { nombre: 'Danza', categoria: 'arte' },
    { nombre: 'Lectura', categoria: 'cultura' },
    { nombre: 'Cine', categoria: 'cultura' },
  ];
  for (const { nombre, categoria } of intereses) {
    await prisma.interest.upsert({ where: { nombre }, update: { categoria }, create: { nombre, categoria } });
  }
  console.log(`Seed intereses: ${intereses.length}`);

  const comercioHash = await argon2id({
    password: 'Comercio123!', salt: randomBytes(16), parallelism: 1,
    iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'encoded',
  });

  const comercios: { nombre: string; descripcion: string; porcentajeDescuento: number; email: string }[] = [
    { nombre: 'Cafetería Demo', descripcion: 'Café y postres', porcentajeDescuento: 15, email: 'comercio@demo.local' },
    { nombre: 'Panadería La Espiga', descripcion: 'Pan artesanal y repostería fresca todos los días.', porcentajeDescuento: 10, email: 'contacto@panaderialaespiga.mx' },
    { nombre: 'Boutique Luna', descripcion: 'Ropa y accesorios para jóvenes, tendencias de temporada.', porcentajeDescuento: 15, email: 'ventas@boutiqueluna.mx' },
    { nombre: 'Gimnasio PowerFit', descripcion: 'Entrenamiento funcional, pesas y clases grupales.', porcentajeDescuento: 20, email: 'info@powerfitsat.mx' },
    { nombre: 'Librería El Estudiante', descripcion: 'Útiles escolares, libros y servicio de impresión.', porcentajeDescuento: 10, email: 'pedidos@libreriaelestudiante.mx' },
    { nombre: 'Pizzería Don Toño', descripcion: 'Pizza artesanal al horno de leña, servicio a domicilio.', porcentajeDescuento: 12, email: 'contacto@dontonopizza.mx' },
    { nombre: 'Barbería Estilo Urbano', descripcion: 'Cortes modernos y clásicos, ambiente juvenil.', porcentajeDescuento: 15, email: 'citas@estilourbanobarber.mx' },
    { nombre: 'Óptica VisiónClara', descripcion: 'Exámenes de la vista y armazones de moda.', porcentajeDescuento: 10, email: 'contacto@visionclara.mx' },
    { nombre: 'Farmacia San Andrés', descripcion: 'Medicamentos, artículos de higiene y consulta médica.', porcentajeDescuento: 5, email: 'atencion@farmaciasanandres.mx' },
    { nombre: 'Ciber Café Conecta2', descripcion: 'Renta de equipo, impresiones y trámites en línea.', porcentajeDescuento: 20, email: 'soporte@conecta2cyber.mx' },
  ];
  for (const c of comercios) {
    await prisma.commerce.upsert({
      where: { email: c.email },
      update: {},
      create: { ...c, passwordHash: comercioHash },
    });
  }
  console.log(`Seed comercios: ${comercios.length}`);

  const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const eventos: { titulo: string; descripcion: string; categoria: 'deportivo' | 'cultural' | 'taller'; fecha: Date; lugar: string; puntosOtorgados: number }[] = [
    { titulo: 'Torneo Municipal de Fútbol Juvenil', descripcion: 'Competencia por equipos representando a las colonias del municipio. Inscripción abierta a jóvenes de 15 a 29 años.', categoria: 'deportivo', fecha: dias(10), lugar: 'Unidad Deportiva Municipal', puntosOtorgados: 350 },
    { titulo: 'Festival Cultural de Primavera', descripcion: 'Muestra de música, danza y artes visuales con artistas locales e invitados.', categoria: 'cultural', fecha: dias(18), lugar: 'Plaza Cívica de San Andrés Tuxtla', puntosOtorgados: 300 },
    { titulo: 'Taller de Liderazgo Juvenil', descripcion: 'Sesión práctica sobre trabajo en equipo, comunicación efectiva y toma de decisiones.', categoria: 'taller', fecha: dias(7), lugar: 'Casa de la Cultura', puntosOtorgados: 250 },
    { titulo: 'Carrera Atlética 5K San Andrés', descripcion: 'Carrera recreativa y competitiva abierta a toda la juventud del municipio.', categoria: 'deportivo', fecha: dias(25), lugar: 'Malecón del río Tecolapan', puntosOtorgados: 300 },
    { titulo: 'Noche de Talentos', descripcion: 'Espacio abierto para que jóvenes muestren su talento en música, comedia y artes escénicas.', categoria: 'cultural', fecha: dias(14), lugar: 'Auditorio Municipal', puntosOtorgados: 200 },
    { titulo: 'Taller de Primeros Auxilios', descripcion: 'Capacitación básica en RCP y atención de emergencias, impartido por Protección Civil.', categoria: 'taller', fecha: dias(12), lugar: 'DIF Municipal', puntosOtorgados: 200 },
    { titulo: 'Torneo de Básquetbol 3x3', descripcion: 'Formato rápido en canchas municipales, premiación a los tres primeros lugares.', categoria: 'deportivo', fecha: dias(20), lugar: 'Cancha Techada Central', puntosOtorgados: 300 },
    { titulo: 'Exposición de Arte Joven', descripcion: 'Muestra colectiva de pintura, fotografía e ilustración de artistas emergentes del municipio.', categoria: 'cultural', fecha: dias(30), lugar: 'Casa de la Cultura', puntosOtorgados: 250 },
    { titulo: 'Taller de Finanzas Personales', descripcion: 'Introducción al ahorro, presupuesto y uso responsable del crédito para jóvenes.', categoria: 'taller', fecha: dias(9), lugar: 'Centro de Emprendimiento Juvenil', puntosOtorgados: 200 },
    { titulo: 'Clínica de Voleibol', descripcion: 'Entrenamiento con técnicos certificados abierto a principiantes y avanzados.', categoria: 'deportivo', fecha: dias(16), lugar: 'Unidad Deportiva Municipal', puntosOtorgados: 250 },
  ];
  const eventoCount = await prisma.event.count();
  if (eventoCount === 0) {
    await prisma.event.createMany({ data: eventos });
  }
  console.log(`Seed eventos: ${eventos.length} (existentes: ${eventoCount})`);

  const talleres: { titulo: string; descripcion: string; precio: number; horario: string; modalidad: 'presencial' | 'virtual' | 'hibrido' }[] = [
    { titulo: 'Diseño Gráfico con Herramientas Digitales', descripcion: 'Fundamentos de diseño, tipografía y composición usando software libre.', precio: 450, horario: 'Lunes y miércoles 16:00–18:00', modalidad: 'presencial' },
    { titulo: 'Programación Web Básica', descripcion: 'HTML, CSS y JavaScript desde cero, con proyecto final para portafolio.', precio: 600, horario: 'Martes y jueves 17:00–19:00', modalidad: 'hibrido' },
    { titulo: 'Repostería y Panadería', descripcion: 'Técnicas básicas de panificación y decoración de postres.', precio: 350, horario: 'Sábados 10:00–13:00', modalidad: 'presencial' },
    { titulo: 'Inglés Conversacional', descripcion: 'Práctica oral enfocada en situaciones cotidianas y laborales.', precio: 500, horario: 'Lunes a viernes 18:00–19:00', modalidad: 'virtual' },
    { titulo: 'Corte y Confección', descripcion: 'Elaboración de prendas básicas, patronaje y uso de máquina de coser.', precio: 400, horario: 'Martes y jueves 16:00–18:00', modalidad: 'presencial' },
    { titulo: 'Electricidad Básica (Convenio ICATVER)', descripcion: 'Instalaciones eléctricas residenciales, normas de seguridad y certificación.', precio: 550, horario: 'Sábados 9:00–13:00', modalidad: 'presencial' },
    { titulo: 'Fotografía Digital', descripcion: 'Composición, manejo de cámara y edición básica de imágenes.', precio: 380, horario: 'Miércoles 17:00–19:00', modalidad: 'presencial' },
    { titulo: 'Marketing Digital para Emprendedores', descripcion: 'Redes sociales, publicidad básica y ventas en línea para negocios propios.', precio: 500, horario: 'Viernes 16:00–19:00', modalidad: 'hibrido' },
  ];
  const workshopCount = await prisma.workshop.count();
  if (workshopCount === 0) {
    await prisma.workshop.createMany({ data: talleres });
  }
  console.log(`Seed talleres: ${talleres.length} (existentes: ${workshopCount})`);

  const vacantes: { puesto: string; empresa: string; requisitos: string; contacto: string }[] = [
    { puesto: 'Auxiliar Administrativo', empresa: 'Grupo Comercial San Andrés', requisitos: 'Bachillerato terminado, manejo de Excel, disponibilidad de horario.', contacto: 'rrhh@gruposanandres.com.mx' },
    { puesto: 'Mesero/a', empresa: 'Restaurante Los Tuxtlas', requisitos: 'Experiencia mínima de 6 meses, disponibilidad fines de semana.', contacto: 'Presentarse con CV en sucursal' },
    { puesto: 'Desarrollador Junior', empresa: 'TecnoSoluciones Veracruz', requisitos: 'Conocimientos en JavaScript y bases de datos, recién egresados bienvenidos.', contacto: 'vacantes@tecnosoluciones.mx' },
    { puesto: 'Promotor de Ventas', empresa: 'Farmacia San Andrés', requisitos: 'Secundaria terminada, buena actitud de servicio al cliente.', contacto: 'Presentarse con CV en sucursal' },
    { puesto: 'Auxiliar Contable', empresa: 'Despacho Contable Ramírez', requisitos: 'Estudiante o egresado de Contaduría, manejo de paquetería Office.', contacto: 'contabilidad.ramirez@gmail.com' },
    { puesto: 'Community Manager', empresa: 'Agencia Creativa Digital', requisitos: 'Conocimiento en redes sociales y diseño básico, portafolio.', contacto: 'hola@agenciacreativa.mx' },
    { puesto: 'Instructor de Gimnasio', empresa: 'PowerFit', requisitos: 'Certificación en entrenamiento físico o experiencia comprobable.', contacto: 'powerfit.sat@gmail.com' },
    { puesto: 'Practicante de Recursos Humanos', empresa: 'Ayuntamiento de San Andrés Tuxtla', requisitos: 'Estudiante de últimos semestres de Psicología o afines.', contacto: 'practicas@sanandrestuxtla.gob.mx' },
  ];
  const jobCount = await prisma.jobPosting.count();
  if (jobCount === 0) {
    await prisma.jobPosting.createMany({ data: vacantes });
  }
  console.log(`Seed vacantes: ${vacantes.length} (existentes: ${jobCount})`);

  const recursos: { tipo: 'educacion' | 'deporte' | 'cultura'; titulo: string; categoria: string; descripcion: string; contacto?: string }[] = [
    { tipo: 'educacion', titulo: 'Universidad Veracruzana', categoria: 'Xalapa, Veracruz', descripcion: 'Oferta académica de licenciaturas y posgrados con becas.', contacto: 'https://www.uv.mx' },
    { tipo: 'educacion', titulo: 'ITSSAT', categoria: 'Cerca de mí', descripcion: 'Instituto Tecnológico Superior de San Andrés Tuxtla.', contacto: 'https://www.itssat.edu.mx' },
    { tipo: 'educacion', titulo: 'Universidad de Xalapa', categoria: 'Xalapa, Veracruz', descripcion: 'Programas educativos diseñados para impulsar tu futuro.' },
    { tipo: 'deporte', titulo: 'Try-Out de Fútbol', categoria: 'Fútbol', descripcion: 'Visorías para beca deportiva universitaria. Demuestra tu talento.', contacto: 'deporte@juventudsanandres.gob.mx' },
    { tipo: 'deporte', titulo: 'Beca de Básquetbol', categoria: 'Básquetbol', descripcion: 'Entrena con disciplina y estudia con una beca deportiva.' },
    { tipo: 'deporte', titulo: 'Try-Out de Atletismo', categoria: 'Atletismo', descripcion: 'Participa en las visorías y compite con pasión.' },
    { tipo: 'cultura', titulo: 'Banda Municipal', categoria: 'Música', descripcion: 'Programa artístico con becas culturales para formación musical.', contacto: 'cultura@juventudsanandres.gob.mx' },
    { tipo: 'cultura', titulo: 'Taller de Danza', categoria: 'Danza', descripcion: 'Desarrolla tu talento y participa en presentaciones culturales.' },
    { tipo: 'cultura', titulo: 'Conservatorio', categoria: 'Artes escénicas', descripcion: 'Becas artísticas y certificación de habilidades artísticas.' },
  ];
  const recursoCount = await prisma.recurso.count();
  if (recursoCount === 0) {
    await prisma.recurso.createMany({ data: recursos });
  }
  console.log(`Seed recursos: ${recursos.length} (existentes: ${recursoCount})`);
}

main().finally(() => prisma.$disconnect());
