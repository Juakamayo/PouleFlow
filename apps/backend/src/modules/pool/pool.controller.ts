import { Controller, Get, Post, Body, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { PoolService } from './pool.service';
import { SaveScoresDto } from './dto/save-scores.dto';

@Controller('events/:eventId')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Post('pools/generate')
  generatePools(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body('force') force?: boolean,
    @Body('poolCount') poolCount?: number,
  ) {
    return this.poolService.generateForEvent(eventId, force, poolCount);
  }

  @Get('pools')
  getPools(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.poolService.findByEvent(eventId);
  }

  @Delete('pools')
  deletePools(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.poolService.deleteByEvent(eventId);
  }

  // --- NUEVOS ENDPOINTS LÓGICOS ---

  @Post('pools/:poolId/scores')
  saveScores(
    @Param('poolId', ParseIntPipe) poolId: number,
    @Body() dto: SaveScoresDto,
  ) {
    return this.poolService.savePoolScores(poolId, dto);
  }

  @Get('ranking')
  getEventRanking(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.poolService.calculateEventRanking(eventId);
  }
}