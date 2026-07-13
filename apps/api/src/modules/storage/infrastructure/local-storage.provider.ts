import { promises as fs } from "fs";
import { dirname, join, normalize } from "path";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  StorageProvider,
  UploadedObject,
  UploadObjectInput,
} from "../application/storage-provider";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async upload(input: UploadObjectInput): Promise<UploadedObject> {
    const path = this.resolve(input.key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, input.body);

    return {
      key: input.key,
      url: `/uploads/${input.key}`,
    };
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  private resolve(key: string): string {
    const basePath = this.configService.get<string>("LOCAL_STORAGE_PATH", "./uploads");
    const normalized = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    return join(basePath, normalized);
  }
}
