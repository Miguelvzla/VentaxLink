import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  banner_url?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primary_color?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondary_color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagram_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  google_maps_url?: string;

  /** Si es true, borra la clave CallMeBot guardada para avisos por WhatsApp. */
  @IsOptional()
  @IsBoolean()
  clear_notify_callmebot_apikey?: boolean;

  /** Clave API de CallMeBot (https://www.callmebot.com/) para recibir pedidos por WhatsApp. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notify_callmebot_apikey?: string;

  /** Si está en false, no se envían avisos automáticos por WhatsApp al comercio (el email sigue si SMTP está configurado). */
  @IsOptional()
  @IsBoolean()
  auto_whatsapp?: boolean;

  /** Enviar mail al cliente al confirmar pedido (requiere SMTP del comercio y email en el pedido). */
  @IsOptional()
  @IsBoolean()
  notify_customer_order_email?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtp_host?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtp_port?: number | null;

  @IsOptional()
  @IsBoolean()
  smtp_secure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtp_user?: string;

  /** Si se envía vacío y no usás clear_smtp_credentials, no cambia la clave guardada. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtp_pass?: string;

  @IsOptional()
  @IsEmail()
  smtp_from_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  smtp_from_name?: string;

  @IsOptional()
  @IsBoolean()
  clear_smtp_credentials?: boolean;

  /** Plan contratado (upgrade/downgrade manual hasta integrar cobro recurrente). */
  @IsOptional()
  @IsIn(['STARTER', 'PRO', 'WHOLESALE'])
  plan?: 'STARTER' | 'PRO' | 'WHOLESALE';

  @IsOptional()
  @IsBoolean()
  points_enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0.01)
  points_ars_per_point?: number | null;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  points_redeem_min_balance?: number | null;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  points_redeem_percent?: number | null;

  @IsOptional()
  @Type(() => Number)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  points_redeem_cost?: number | null;

  /** Recordatorio mensual de cobro (solo Pro / Mayorista; requiere SMTP del comercio o global) */
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
