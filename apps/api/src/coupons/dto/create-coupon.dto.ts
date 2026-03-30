import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Solo letras, números, guiones y guión bajo',
  })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Porcentaje de descuento (1–100) */
  @Type(() => Number)
  @Min(1)
  @Max(100)
  percent!: number;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
