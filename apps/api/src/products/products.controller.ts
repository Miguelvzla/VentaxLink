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
