import { PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  StorageProvider,
  UploadedObject,
  UploadObjectInput,
} from "../application/storage-provider";

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.get<string>("S3_REGION", "us-east-1"),
      credentials: {
        accessKeyId: this.configService.get<string>("S3_ACCESS_KEY_ID", ""),
        secretAccessKey: this.configService.get<string>("S3_SECRET_ACCESS_KEY", ""),
      },
    });
  }

  async upload(input: UploadObjectInput): Promise<UploadedObject> {
    const bucket = this.configService.getOrThrow<string>("S3_BUCKET");
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );

    return {
      key: input.key,
      url: `s3://${bucket}/${input.key}`,
    };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.getOrThrow<string>("S3_BUCKET"),
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    return `s3://${this.configService.getOrThrow<string>("S3_BUCKET")}/${key}`;
  }
}
