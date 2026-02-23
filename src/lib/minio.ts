import * as Minio from 'minio';

function isTrue(value: string | undefined): boolean {
  return (value || '').toLowerCase() === 'true';
}

const useSSL = isTrue(process.env.MINIO_USE_SSL ?? process.env.MINIO_SECURE);
const bucketName = process.env.MINIO_BUCKET || process.env.MINIO_BUCKET_NAME || 'herobase';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

const BUCKET_NAME = bucketName;

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
  }
}

export async function uploadFile(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
  await ensureBucket();
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  // Return the object path; the full URL can be constructed from env vars
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  const protocol = useSSL ? 'https' : 'http';
  return `${protocol}://${endpoint}:${port}/${BUCKET_NAME}/${objectName}`;
}

export async function getFileUrl(objectName: string, expirySeconds = 3600): Promise<string> {
  return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds);
}

export async function deleteFile(objectName: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, objectName);
}

export async function fileExists(objectName: string): Promise<boolean> {
  try {
    await minioClient.statObject(BUCKET_NAME, objectName);
    return true;
  } catch (error) {
    return false;
  }
}

export { minioClient, BUCKET_NAME };
