import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { Env } from '../config.js';

export interface BlobStore {
  putText(key: string, content: string, contentType: string): Promise<void>;
  getText(key: string): Promise<string>;
}

export function createR2BlobStore(env: Env): BlobStore | null {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    return null;
  }

  const client = new S3Client({
    region: env.R2_REGION ?? 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const bucket = env.R2_BUCKET;

  return {
    async putText(key: string, content: string, contentType: string) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content,
          ContentType: contentType,
        })
      );
    },
    async getText(key: string) {
      const resp = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      if (!resp.Body) {
        throw new Error('R2 object has no body');
      }
      return streamToString(resp.Body as any);
    },
  };
}

async function streamToString(stream: AsyncIterable<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}







