import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  percent?: number;

  @IsOptional()
  @IsDateString()
  starts_at?: string | null;

  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_uses?: number | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
