import { Module } from '@nestjs/common';
import { FencerController } from './fencer.controller';
import { FencerService } from './fencer.service';

@Module({
  controllers: [FencerController],
  providers: [FencerService],
  exports: [FencerService],
})
export class FencerModule {}
