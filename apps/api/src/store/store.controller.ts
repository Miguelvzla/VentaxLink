import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CheckoutDto } from './dto/checkout.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { OG_EMERGENCY_PNG, encodeOgFallbackPng } from './store-og-fallback-png';
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

  /** Prueba SMTP global (Railway). Solo Pro/Mayorista y con ENABLE_STORE_SMTP_TEST=1 */
  @Post(':slug/mail-test')
  mailTest(@Param('slug') slug: string) {
    return this.store.sendProMailTest(slug);
  }

  @Get(':slug/products/:pSlug')
  product(@Param('slug') slug: string, @Param('pSlug') pSlug: string) {
    return this.store.getProduct(slug, pSlug);
  }

  @Get(':slug/og-collage.png')
  async ogCollage(
    @Param('slug') slug: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      const { body, version } = await this.store.getOgCollageForHttp(slug);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Cache-Control',
        'public, max-age=3600, stale-while-revalidate=86400',
      );
      res.setHeader('ETag', `"${version}"`);
      res.send(body);
    } catch (e) {
      if (e instanceof NotFoundException) {
        res.status(404).end();
        return;
      }
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      try {
        res.send(encodeOgFallbackPng());
      } catch {
        res.send(OG_EMERGENCY_PNG);
      }
    }
  }

  @Get(':slug/categories')
  categories(@Param('slug') slug: string) {
    return this.store.listCategories(slug);
  }

  @Get(':slug/products')
  products(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('featured') featured?: string,
    @Query('new_only') new_only?: string,
    @Query('category') category?: string,
  ) {
    const featuredOnly =
      featured === '1' || featured?.toLowerCase() === 'true';
    const newOnly =
      new_only === '1' || new_only?.toLowerCase() === 'true';
    return this.store.listProducts(slug, page, limit, q, {
      featuredOnly,
      newOnly,
      categorySlug: category?.trim() || undefined,
    });
  }

  @Get(':slug')
  tenant(@Param('slug') slug: string) {
    return this.store.getPublicTenant(slug);
  }
}
