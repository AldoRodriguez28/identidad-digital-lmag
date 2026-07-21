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
}

main().finally(() => prisma.$disconnect());
