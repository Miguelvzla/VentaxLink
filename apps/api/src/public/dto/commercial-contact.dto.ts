import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CommercialContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  commerce?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  message!: string;

  /** Para Reply-To en el mail a soporte */
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  reply_email?: string;
}
