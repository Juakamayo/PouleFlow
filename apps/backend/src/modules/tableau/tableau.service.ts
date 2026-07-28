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

  // Orden estándar FIE para los cruces iniciales de un cuadro de Eliminación Directa
  // Asegura que el 1 se cruce con el N, el 2 con el N-1, etc., de forma equilibrada.
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
    // 1. Obtener la clasificación general de las poules ya calculada
    const ranking = await this.poolService.calculateEventRanking(eventId);
    if (!ranking || ranking.length < 2) {
      throw new ConflictException('Se requiere una clasificación general de poules con al menos 2 tiradores para generar la Eliminación Directa.');
    }

    const totalFencers = ranking.length;

    // 2. Determinar el tamaño del cuadro (potencia de 2 más cercana hacia arriba: 4, 8, 16, 32, etc.)
    let targetSize = dto.targetSize;
    if (!targetSize) {
      targetSize = 4;
      while (targetSize < totalFencers && targetSize < 64) {
        targetSize *= 2;
      }
    }

    // Verificar si ya existe un cuadro previo para limpiarlo o evitar duplicados
    const existingTableau = await this.prisma.tableau.findFirst({
      where: { eventId },
    });

    if (existingTableau) {
      await this.prisma.tableauMatch.deleteMany({ where: { tableauId: existingTableau.id } });
      await this.prisma.tableau.delete({ where: { id: existingTableau.id } });
    }

    // 3. Crear el registro del Tableau principal
    const tableau = await this.prisma.tableau.create({
      data: {
        eventId,
        size: targetSize,
      },
    });

    const standardOrder = this.getTableauOrder(targetSize);
    const defaultTouches = dto.defaultTouches ?? 15;
    const finalTouches = dto.finalTouches ?? defaultTouches;

    // 4. Generar los combates de la primera ronda (Octavos, Cuartos, etc. dependiendo del tamaño)
    const matchesData = standardOrder.map((seedA, index) => {
      const seedB = standardOrder[index + 1];
      // Solo tomamos pares (0 y 1, 2 y 3, etc.)
      if (index % 2 !== 0) return null;

      const fencerA = ranking.find(r => r.seed === seedA);
      const fencerB = ranking.find(r => r.seed === seedB);

      // Si el seed supera el total de tiradores reales, queda como "Bye" (pase directo)
      const hasBye = !fencerA || !fencerB;

      return {
        tableauId: tableau.id,
        round: targetSize, // Ej: 8 para cuartos, 16 para octavos
        matchNumber: Math.floor(index / 2) + 1,
        fencerAId: fencerA ? fencerA.fencer.id : null,
        fencerBId: fencerB ? fencerB.fencer.id : null,
        // Si hay un Bye, el tirador presente gana automáticamente
        winnerId: fencerA && !fencerB ? fencerA.fencer.id : (!fencerA && fencerB ? fencerB.fencer.id : null),
        scoreA: fencerA && !fencerB ? defaultTouches : 0,
        scoreB: !fencerA && fencerB ? defaultTouches : 0,
        status: hasBye ? 'COMPLETED' : 'PENDING',
        targetTouches: targetSize <= 4 ? finalTouches : defaultTouches, // Aplicar toques diferenciados para finales si se solicita
      };
    }).filter(Boolean);

    await this.prisma.tableauMatch.createMany({
      data: matchesData as any,
    });

    return this.prisma.tableau.findUnique({
      where: { id: tableau.id },
      include: { matches: { include: { fencerA: true, fencerB: true, winner: true } } },
    });
  }

  async getTableau(eventId: number) {
    const tableau = await this.prisma.tableau.findFirst({
      where: { eventId },
      include: {
        matches: {
          include: {
            fencerA: { include: { club: true, country: true } },
            fencerB: { include: { club: true, country: true } },
            winner: true,
          },
          orderBy: [{ round: 'desc' }, { matchNumber: 'asc' }],
        },
      },
    });

    if (!tableau) throw new NotFoundException('No hay un cuadro de Eliminación Directa generado para este evento.');
    return tableau;
  }
}