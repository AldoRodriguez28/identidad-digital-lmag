import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg' };

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Storage sobre Cloudflare R2 (S3-compatible). Keys con forma `san-andres/{studentId}/ine-frente-{random}.png`. */
@Injectable()
export class R2Storage extends StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: { endpoint: string; accessKeyId: string; secretAccessKey: string; bucket: string }) {
    super();
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(buffer: Buffer, contentType: string, folder?: string): Promise<string> {
    const ext = EXT[contentType] ?? 'bin';
    const random = randomBytes(12).toString('base64url');
    const key = folder ? `${folder}-${random}.${ext}` : `${random}.${ext}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return streamToBuffer(res.Body as NodeJS.ReadableStream);
  }
}
