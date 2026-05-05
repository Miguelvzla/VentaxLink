import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PatchMarketplaceTermsDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(40, {
    message: 'Los términos deben tener al menos 40 caracteres',
  })
  @MaxLength(20000)
  terms!: string;
}
