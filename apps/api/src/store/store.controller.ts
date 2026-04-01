import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CheckoutDto } from './dto/checkout.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { StoreService } from './store.service';

@Controller('store')
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Post(':slug/checkout')
  checkout(@Param('slug') slug: string, @Body() dto: CheckoutDto) {
    return this.store.checkout(slug, dto);
  }

  @Post(':slug/track')
  track(@Param('slug') slug: string, @Body() dto: TrackEventDto) {
    return this.store.trackEvent(slug, dto);
  }

  @Get(':slug/products/:pSlug')
  product(@Param('slug') slug: string, @Param('pSlug') pSlug: string) {
    return this.store.getProduct(slug, pSlug);
  }

  @Get(':slug/products')
  products(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
    @Query('q') q?: string,
  ) {
    return this.store.listProducts(slug, page, limit, q);
  }

  @Get(':slug')
  tenant(@Param('slug') slug: string) {
    return this.store.getPublicTenant(slug);
  }
}
