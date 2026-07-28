import {
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PoolService } from './pool.service';

@Controller('events/:eventId/pools')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get()
  findAll(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.poolService.findAllForEvent(eventId);
  }

  @Post('generate')
  generate(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
    @Query('poolCount', new ParseIntPipe({ optional: true })) poolCount?: number,
  ) {
    return this.poolService.generateForEvent(eventId, { force, poolCount });
  }

  @Delete()
  remove(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.poolService.removeAllForEvent(eventId);
  }
}
