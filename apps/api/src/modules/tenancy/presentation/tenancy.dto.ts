import { IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  document?: string;
}

export class CreateNamedEntityDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
