export interface UploadObjectInput {
  key: string;
  contentType: string;
  body: Buffer;
  metadata?: Record<string, string>;
}

export interface UploadedObject {
  key: string;
  url: string;
}

export interface StorageProvider {
  upload(input: UploadObjectInput): Promise<UploadedObject>;
  remove(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
