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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: { tid: string }) {
    return this.service.list(user.tid);
  }

  @Post()
  create(@CurrentUser() user: { tid: string }, @Body() dto: CreateCategoryDto) {
    return this.service.create(user.tid, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { tid: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(user.tid, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { tid: string }, @Param('id') id: string) {
    return this.service.remove(user.tid, id);
  }
}
