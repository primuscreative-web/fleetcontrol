import type { Prisma } from "@fleetcontrol/database";
import { IsOptional, IsString } from "class-validator";

export class CreateRoleDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export class AssignPermissionDto {
  @IsString()
  permissionId!: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  conditions?: Prisma.InputJsonValue;
}
