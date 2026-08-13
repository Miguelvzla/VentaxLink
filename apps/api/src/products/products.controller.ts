import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkPriceUpdateDto } from './dto/bulk-price-update.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentUser() user: { tid: string }) {
    return this.products.list(user.tid);
  }

  @Post()
  create(@CurrentUser() user: { tid: string }, @Body() dto: CreateProductDto) {
    return this.products.create(user.tid, dto);
  }

  /**
   * Carga masiva de precios desde planilla `nombre | precio`.
   * Sin `dry_run: false` solo devuelve la vista previa, no escribe.
   */
  @Post('bulk-price')
  bulkPrice(
    @CurrentUser() user: { tid: string },
    @Body() dto: BulkPriceUpdateDto,
  ) {
    return this.products.bulkPriceUpdate(user.tid, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { tid: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.tid, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { tid: string }, @Param('id') id: string) {
    return this.products.softDelete(user.tid, id);
  }
}
