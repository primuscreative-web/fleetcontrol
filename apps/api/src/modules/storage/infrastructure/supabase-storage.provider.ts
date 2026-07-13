import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  StorageProvider,
  UploadedObject,
  UploadObjectInput,
} from "../application/storage-provider";

@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
    );
  }

  async upload(input: UploadObjectInput): Promise<UploadedObject> {
    const bucket = this.configService.getOrThrow<string>("SUPABASE_STORAGE_BUCKET");
    const { error } = await this.client.storage.from(bucket).upload(input.key, input.body, {
      contentType: input.contentType,
      upsert: true,
    });

    if (error) {
      throw error;
    }

    return {
      key: input.key,
      url: this.client.storage.from(bucket).getPublicUrl(input.key).data.publicUrl,
    };
  }

  async remove(key: string): Promise<void> {
    const bucket = this.configService.getOrThrow<string>("SUPABASE_STORAGE_BUCKET");
    const { error } = await this.client.storage.from(bucket).remove([key]);

    if (error) {
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const bucket = this.configService.getOrThrow<string>("SUPABASE_STORAGE_BUCKET");
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }
}
