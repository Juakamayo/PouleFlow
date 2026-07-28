import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoolService } from '../pool/pool.service';
import { GenerateTableauDto } from './dto/generate-tableau.dto';

@Injectable()
export class TableauService {
  constructor(
    private prisma: PrismaService,
    private poolService: PoolService,
  ) {}

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
    const ranking = await this.poolService.calculateEventRanking(eventId);
    if (!ranking || ranking.length < 2) {
      throw new ConflictException('Se requiere una clasificación general de poules con al menos 2 tiradores para generar la Eliminación Directa.');
    }

    const totalFencers = ranking.length;

    let targetSize = dto.targetSize;
    if (!targetSize) {
      targetSize = 4;
      while (targetSize < totalFencers && targetSize < 64) {
        targetSize *= 2;
      }
    }

    const existingTableau = await this.prisma.tableau.findFirst({
      where: { eventId },
    });

    if (existingTableau) {
      await this.prisma.bracketMatch.deleteMany({ where: { tableauId: existingTableau.id } });
      await this.prisma.tableau.delete({ where: { id: existingTableau.id } });
    }

    const tableau = await this.prisma.tableau.create({
      data: {
        eventId,
        size: targetSize,
      },
    });

    const standardOrder = this.getTableauOrder(targetSize);
    const defaultTouches = dto.defaultTouches ?? 15;

    const matchesData = standardOrder.map((seedA, index) => {
      const seedB = standardOrder[index + 1];
      if (index % 2 !== 0) return null;

      const fencerA = ranking.find(r => r.seed === seedA);
      const fencerB = ranking.find(r => r.seed === seedB);
      const hasBye = !fencerA || !fencerB;

      return {
        tableauId: tableau.id,
        round: targetSize,
        matchNumber: Math.floor(index / 2) + 1,
        fencerAId: fencerA ? fencerA.fencer.id : null,
        fencerBId: fencerB ? fencerB.fencer.id : null,
        winnerId: fencerA && !fencerB ? fencerA.fencer.id : (!fencerA && fencerB ? fencerB.fencer.id : null),
        scoreA: fencerA && !fencerB ? defaultTouches : 0,
        scoreB: !fencerA && fencerB ? defaultTouches : 0,
        status: hasBye ? 'COMPLETED' : 'PENDING',
      };
    }).filter(Boolean);

    await this.prisma.bracketMatch.createMany({
      data: matchesData as any,
    });

    return this.prisma.tableau.findUnique({
      where: { id: tableau.id },
      include: { bracketMatches: { include: { fencerA: true, fencerB: true, winner: true } } },
    });
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
          orderBy: { round: 'desc' },
        },
      },
    });

    if (!tableau) throw new NotFoundException('No hay un cuadro de Eliminación Directa generado para este evento.');
    return tableau;
  }
}