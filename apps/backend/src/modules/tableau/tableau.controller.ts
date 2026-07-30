import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TableauService } from './tableau.service';
import { GenerateTableauDto } from './dto/generate-tableau.dto';
import { UpdateBracketMatchDto } from './dto/update-bracket-match.dto';
import { UpdateTableauConfigDto } from './dto/update-tableau-config.dto';

@Controller('events/:eventId/tableau')
export class TableauController {
  constructor(private readonly tableauService: TableauService) {}

  @Post('generate')
  generateTableau(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: GenerateTableauDto,
  ) {
    return this.tableauService.generateTableau(eventId, dto);
  }

  @Get()
  getTableau(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.tableauService.getTableau(eventId);
  }

  @Patch('matches/:matchId')
  updateBracketMatch(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: UpdateBracketMatchDto,
  ) {
    return this.tableauService.updateBracketMatch(matchId, dto);
  }

  @Patch('config')
  updateConfig(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: UpdateTableauConfigDto,
  ) {
    return this.tableauService.updateConfig(eventId, dto);
  }

  @Post('advance')
  advanceRound(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.tableauService.advanceRound(eventId);
  }

  @Delete()
  deleteTableau(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.tableauService.deleteTableau(eventId);
  }

  @Get('results')
  getFinalResults(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.tableauService.getFinalResults(eventId);
  }
}