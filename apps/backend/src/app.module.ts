import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { CountryModule } from './modules/country/country.module';
import { ClubModule } from './modules/club/club.module';
import { FencerModule } from './modules/fencer/fencer.module';
import { RefereeModule } from './modules/referee/referee.module';
import { WeaponModule } from './modules/weapon/weapon.module';
import { CategoryModule } from './modules/category/category.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { EventModule } from './modules/event/event.module';
import { RegistrationModule } from './modules/registration/registration.module';

@Module({
  imports: [
    PrismaModule,
    CountryModule,
    ClubModule,
    FencerModule,
    RefereeModule,
    WeaponModule,
    CategoryModule,
    TournamentModule,
    EventModule,
    RegistrationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
