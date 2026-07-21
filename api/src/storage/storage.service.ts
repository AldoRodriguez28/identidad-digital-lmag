export abstract class StorageService {
  abstract put(buffer: Buffer, contentType: string): Promise<string>;
  abstract getPath(key: string): string;
}
