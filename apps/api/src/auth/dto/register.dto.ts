import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'El nombre del comercio es muy corto' })
  @MaxLength(120)
  storeName!: string;

  @IsString()
  @MinLength(2, { message: 'El link es muy corto' })
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Usá solo letras minúsculas, números y guiones (ej: mi-tienda)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  slug!: string;

  @IsEmail({}, { message: 'Email no válido' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Poné un teléfono de contacto' })
  @MaxLength(40)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ownerName?: string;

  /** STARTER = gratis; PRO y WHOLESALE quedan registrados y el cobro se coordina aparte. */
  @IsOptional()
  @IsIn(['STARTER', 'PRO', 'WHOLESALE'], {
    message: 'Plan no válido',
  })
  plan?: 'STARTER' | 'PRO' | 'WHOLESALE';

  @IsBoolean({ message: 'Debés aceptar términos y condiciones' })
  accepts_terms!: boolean;
}
