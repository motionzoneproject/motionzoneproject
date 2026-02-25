import { S3Client } from "@aws-sdk/client-s3";

type S3Resources = {
  bucket: string;
  publicUrl: string;
  normalizedPublicUrl: string;
  client: S3Client;
};

type GlobalWithS3Client = typeof globalThis & {
  motionzoneS3Client?: S3Client;
};

export function getS3Resources(): S3Resources | null {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "us-east-1";
  const publicUrl = process.env.S3_PUBLIC_URL;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !endpoint || !publicUrl || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const globalForS3 = globalThis as GlobalWithS3Client;
  if (!globalForS3.motionzoneS3Client) {
    globalForS3.motionzoneS3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  const normalizedPublicUrl = publicUrl.endsWith("/")
    ? publicUrl.slice(0, -1)
    : publicUrl;

  return {
    bucket,
    publicUrl,
    normalizedPublicUrl,
    client: globalForS3.motionzoneS3Client,
  };
}
