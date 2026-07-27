import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { CountryModule } from './modules/country/country.module';
import { ClubModule } from './modules/club/club.module';

@Module({
  imports: [PrismaModule, CountryModule, ClubModule],
  controllers: [AppController],
})
export class AppModule {}
