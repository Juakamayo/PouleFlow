import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FencerService } from './fencer.service';
import { CreateFencerDto } from './dto/create-fencer.dto';
import { UpdateFencerDto } from './dto/update-fencer.dto';
import { FindFencersQueryDto } from './dto/find-fencers-query.dto';

@Controller('fencers')
export class FencerController {
  constructor(private readonly fencerService: FencerService) {}

  @Post()
  create(@Body() dto: CreateFencerDto) {
    return this.fencerService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindFencersQueryDto) {
    return this.fencerService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fencerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFencerDto) {
    return this.fencerService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fencerService.remove(id);
  }
}
