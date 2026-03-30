import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'El nombre es muy corto' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

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

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

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

  /** Foto principal: pegá un link público (https…). Subir archivo desde la PC viene después. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value == null) return undefined;
    if (typeof value === 'string') return value.trim();
    return value;
  })
  @IsString()
  @MaxLength(2048)
  @ValidateIf((_, v) => typeof v === 'string' && v.length > 0)
  @Matches(/^https?:\/\/.+/i, {
    message: 'Tiene que ser un link que empiece con http o https',
  })
  image_url?: string;

  /** Hasta 3 URLs según plan (Pro/Mayorista); si mandás esto, tiene prioridad sobre image_url. */
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
