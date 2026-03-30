import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class PlatformPatchTenantDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  /** Mensaje en la tienda pública si está suspendido por mora */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  billing_hold_message?: string;

  /** Vencimiento del plan (gestión plataforma) */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  plan_expires_at?: string | null;

  /** Recordatorio mensual de cobro (solo Pro / Mayorista) */
  @IsOptional()
  @IsBoolean()
  billing_reminder_enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  @Max(28)
  billing_reminder_day_of_month?: number | null;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(0)
  @Max(23)
  billing_reminder_hour?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  billing_reminder_subject?: string | null;

  @IsOptional()
  @IsString()
  billing_reminder_body?: string | null;

  @IsOptional()
  @IsString()
  billing_payment_alias?: string | null;
}
