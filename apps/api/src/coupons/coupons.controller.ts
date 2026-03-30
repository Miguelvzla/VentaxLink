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
import type { JwtUserPayload } from '../auth/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  list(@CurrentUser() user: JwtUserPayload) {
    return this.coupons.list(user.tid);
  }

  @Post()
  create(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateCouponDto) {
    return this.coupons.create(user.tid, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.coupons.update(user.tid, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.coupons.remove(user.tid, id);
  }
}
