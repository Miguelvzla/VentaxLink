import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Cómo se calcula el precio de venta a partir del costo del proveedor. */
export enum PriceMarkupType {
  /** venta = costo * (1 + valor / 100) */
  PERCENT = 'PERCENT',
  /** venta = costo + valor */
  AMOUNT = 'AMOUNT',
}

export enum PriceRounding {
  NONE = 'NONE',
  NEAREST_100 = 'NEAREST_100',
  NEAREST_1000 = 'NEAREST_1000',
}

/** Tope de filas por archivo: mantiene la transacción de actualización acotada. */
export const BULK_PRICE_MAX_ROWS = 2000;

export class BulkPriceRowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  /** Costo del proveedor, ya parseado a número por el front. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  cost!: number;
}

export class BulkPriceUpdateDto {
  /**
   * Por defecto `true`: si el cliente no manda el flag, se hace la vista previa
   * y no se escribe nada. Aplicar exige mandar `false` explícitamente.
   */
  @IsOptional()
  @IsBoolean()
  dry_run?: boolean;

  @IsEnum(PriceMarkupType)
  markup_type!: PriceMarkupType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  markup_value!: number;

  @IsOptional()
  @IsEnum(PriceRounding)
  rounding?: PriceRounding;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_PRICE_MAX_ROWS, {
    message: `El archivo no puede tener más de ${BULK_PRICE_MAX_ROWS} filas`,
  })
  @ValidateNested({ each: true })
  @Type(() => BulkPriceRowDto)
  items!: BulkPriceRowDto[];
}
