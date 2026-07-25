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

  const comercioEmail = 'comercio@demo.local';
  const comercioHash = await argon2id({
    password: 'Comercio123!', salt: randomBytes(16), parallelism: 1,
    iterations: 3, memorySize: 65536, hashLength: 32, outputType: 'encoded',
  });
  await prisma.commerce.upsert({
    where: { email: comercioEmail },
    update: {},
    create: { nombre: 'Cafetería Demo', descripcion: 'Café y postres', porcentajeDescuento: 15, email: comercioEmail, passwordHash: comercioHash },
  });
  console.log(`Seed comercio demo: ${comercioEmail}`);

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
