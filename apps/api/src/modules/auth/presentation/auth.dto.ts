import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SignInDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  nextPassword!: string;
}
