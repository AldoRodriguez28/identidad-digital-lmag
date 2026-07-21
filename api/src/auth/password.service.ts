import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

// Implementación argon2id vía WASM (hash-wasm): sin binario nativo, funciona en
// cualquier arquitectura (evita el segfault de la binding nativa de argon2 en darwin-x64).
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2id({
      password: plain,
      salt: randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 65536, // KiB
      hashLength: 32,
      outputType: 'encoded', // string PHC "$argon2id$..."
    });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2Verify({ password: plain, hash });
  }
}
