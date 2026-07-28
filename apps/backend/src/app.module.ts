import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service'; // Puedes quitar esta línea si no usas el servicio base
import { PrismaModule } from './prisma/prisma.module';
import { CountryModule } from './modules/country/country.module';
import { ClubModule } from './modules/club/club.module';
import { FencerModule } from './modules/fencer/fencer.module';
import { RefereeModule } from './modules/referee/referee.module';
import { TournamentModule } from './modules/tournament/tournament.module';
import { EventModule } from './modules/event/event.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { PoolModule } from './modules/pool/pool.module';
import { TableauModule } from './modules/tableau/tableau.module';

@Module({
  imports: [
    PrismaModule,
    CountryModule,
    ClubModule,
    FencerModule,
    RefereeModule,
    TournamentModule,
    EventModule,
    RegistrationModule,
    PoolModule,
    TableauModule,
  ],
  controllers: [AppController],
  providers: [], // <-- Quitamos AppService de aquí
})
export class AppModule {}