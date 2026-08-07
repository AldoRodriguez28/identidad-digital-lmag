export abstract class StorageService {
  /** folder: prefijo de la key, ej. `san-andres/{studentId}/ine-frente`. */
  abstract put(buffer: Buffer, contentType: string, folder?: string): Promise<string>;
  abstract get(key: string): Promise<Buffer>;
}
