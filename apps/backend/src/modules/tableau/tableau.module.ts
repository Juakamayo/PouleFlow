import { Module } from '@nestjs/common';
import { TableauController } from './tableau.controller';
import { TableauService } from './tableau.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PoolModule } from '../pool/pool.module';

@Module({
  imports: [PrismaModule, PoolModule],
  controllers: [TableauController],
  providers: [TableauService],
  exports: [TableauService],
})
export class TableauModule {}