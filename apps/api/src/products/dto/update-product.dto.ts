import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede tener minúsculas, números y guiones',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  short_desc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compare_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  is_new?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
  })
  tags?: string[];

  /** Mandá string vacío o null para sacar la foto. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null) return null;
    if (typeof value === 'string') return value.trim();
    return value;
  })
  @ValidateIf((_, v) => v !== null && v !== undefined && String(v).trim() !== '')
  @IsString()
  @MaxLength(2048)
  @Matches(/^https?:\/\/.+|^\/v1\/uploads\/.+/i, {
    message:
      'Usá un link http(s) o una ruta de archivo subido que empiece con /v1/uploads/',
  })
  image_url?: string | null;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return undefined;
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
  })
  @IsString({ each: true })
  image_urls?: string[];
}
