import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RefereeService } from './referee.service';
import { CreateRefereeDto } from './dto/create-referee.dto';
import { UpdateRefereeDto } from './dto/update-referee.dto';

@Controller('referees')
export class RefereeController {
  constructor(private readonly refereeService: RefereeService) {}

  @Post()
  create(@Body() dto: CreateRefereeDto) {
    return this.refereeService.create(dto);
  }

  @Get()
  findAll() {
    return this.refereeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.refereeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRefereeDto) {
    return this.refereeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.refereeService.remove(id);
  }
}
