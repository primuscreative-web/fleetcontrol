import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { STORAGE_PROVIDER } from "./application/storage-provider";
import { LocalStorageProvider } from "./infrastructure/local-storage.provider";
import { S3StorageProvider } from "./infrastructure/s3-storage.provider";
import { SupabaseStorageProvider } from "./infrastructure/supabase-storage.provider";

@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>("STORAGE_DRIVER", "local");

        if (driver === "supabase") {
          return new SupabaseStorageProvider(configService);
        }

        if (driver === "s3") {
          return new S3StorageProvider(configService);
        }

        return new LocalStorageProvider(configService);
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
