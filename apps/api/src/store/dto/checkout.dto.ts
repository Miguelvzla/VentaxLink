import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DeliveryType } from '@prisma/client';

export class CheckoutLineDto {
  @IsString()
  @MinLength(1)
  product_slug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

export class CheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customer_name!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(40)
  customer_phone!: string;

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  delivery_type?: DeliveryType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customer_notes?: string;

  /** Cupón % (planes Pro y Mayorista) */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  coupon_code?: string;

  /** Canje de puntos (si el comercio lo configuró y el cliente tiene saldo) */
  @IsOptional()
  @IsBoolean()
  use_points_redeem?: boolean;
}
