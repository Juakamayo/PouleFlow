// apps/backend/src/modules/tableau/tableau.service.ts
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoolService } from '../pool/pool.service';
import { GenerateTableauDto } from './dto/generate-tableau.dto';

@Injectable()
export class TableauService {
  constructor(
    private prisma: PrismaService,
    private poolService: PoolService,
  ) {}

  // Lógica estándar FIE para orden de cruces
  private getTableauOrder(size: number): number[] {
    if (size === 2) return [1, 2];
    let rounds = [1, 2];
    while (rounds.length < size) {
      const nextSize = rounds.length * 2;
      const newRound: number[] = [];
      for (const seed of rounds) {
        newRound.push(seed);
        newRound.push(nextSize + 1 - seed);
      }
      rounds = newRound;
    }
    return rounds;
  }

  async generateTableau(eventId: number, dto: GenerateTableauDto) {
    try {
      const ranking = await this.poolService.calculateEventRanking(eventId);
      if (!ranking || ranking.length < 2) {
        throw new ConflictException('Se requiere una clasificación general con al menos 2 tiradores.');
      }

      const totalFencers = ranking.length;

      let targetSize = dto.targetSize;
      if (!targetSize) {
        targetSize = 4;
        while (targetSize < totalFencers && targetSize < 64) targetSize *= 2;
      }

      // 1. Limpieza de cuadro anterior si existe
      const existingTableau = await this.prisma.tableau.findFirst({ where: { eventId } });
      if (existingTableau) {
        await this.prisma.bracketMatch.deleteMany({ where: { tableauId: existingTableau.id } });
        await this.prisma.tableau.delete({ where: { id: existingTableau.id } });
      }

      // 2. Construcción de la configuración de toques por ronda numérica
      const defaultTouches = dto.defaultTouches ?? 15;
      const overrides = dto.roundTouchesOverrides ?? {};
      const roundConfigs: Record<number, number> = {};
      
      let currentRoundSize = 2;
      while (currentRoundSize <= targetSize) {
        // Asignar el override si existe, o el valor por defecto
        roundConfigs[currentRoundSize] = overrides[currentRoundSize] ?? defaultTouches;
        currentRoundSize *= 2;
      }

      // 3. Crear el Tableau principal guardando la configuración de toques
      const tableau = await this.prisma.tableau.create({
        data: {
          eventId,
          size: targetSize,
          roundConfigs, // Guardar JSON { "2": 15, "4": 15, "8": 10 }
        },
      });

      // 4. Generación de combates iniciales seguros uno por uno
      const standardOrder = this.getTableauOrder(targetSize);
      const initialTouches = roundConfigs[targetSize] ?? defaultTouches;

      const pairs: [number, number][] = [];
      for (let i = 0; i < standardOrder.length; i += 2) {
        pairs.push([standardOrder[i], standardOrder[i + 1]]);
      }

      let positionCounter = 1;
      for (const pair of pairs) {
        const [seedA, seedB] = pair;
        const fencerA = ranking.find(r => r.seed === seedA);
        const fencerB = ranking.find(r => r.seed === seedB);
        const hasBye = !fencerA || !fencerB;

        // Inserción individual segura alineada al esquema Prisma
        await this.prisma.bracketMatch.create({
          data: {
            tableauId: tableau.id,
            round: targetSize, // Ej: 32 para cuadro de 32
            position: positionCounter++, // Campo position obligatorio
            fencerAId: fencerA ? fencerA.fencer.id : null,
            fencerBId: fencerB ? fencerB.fencer.id : null,
            targetTouches: initialTouches, // Toques iniciales de la primera ronda
            winnerId: fencerA && !fencerB ? fencerA.fencer.id : (!fencerA && fencerB ? fencerB.fencer.id : null),
            scoreA: fencerA && !fencerB ? initialTouches : 0,
            scoreB: !fencerA && fencerB ? initialTouches : 0,
            // status: asignado por defecto 'PENDING' por Prisma
          },
        });
      }

      return this.prisma.tableau.findUnique({
        where: { id: tableau.id },
        include: { bracketMatches: { include: { fencerA: true, fencerB: true, winner: true } } },
      });

    } catch (error: any) {
      console.error('Error generando Tableau:', error);
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message || 'Error interno al generar el cuadro.');
    }
  }

  async getTableau(eventId: number) {
    const tableau = await this.prisma.tableau.findFirst({
      where: { eventId },
      include: {
        bracketMatches: {
          include: {
            fencerA: { include: { club: true, country: true } },
            fencerB: { include: { club: true, country: true } },
            winner: true,
          },
          orderBy: [{ round: 'desc' }, { position: 'asc' }],
        },
      },
    });

    if (!tableau) throw new NotFoundException('No hay un cuadro generado.');
    return tableau;
  }
}