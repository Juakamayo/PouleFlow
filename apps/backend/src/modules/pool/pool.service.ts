import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generatePools } from './pool-algorithm';
import { SaveScoresDto } from './dto/save-scores.dto';

@Injectable()
export class PoolService {
  constructor(private prisma: PrismaService) {}

  // ... (Mantén los métodos generateForEvent, findByEvent y deleteByEvent que ya tenías)
  
  async generateForEvent(eventId: number, force = false, manualPoolCount?: number) {
    // Código existente de generación (mantenlo igual)
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { registrations: { include: { fencer: true } } } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.registrations.length < 2) throw new ConflictException('Mínimo 2 tiradores');
    
    const existing = await this.prisma.pool.count({ where: { eventId } });
    if (existing > 0) {
      if (!force) throw new ConflictException('Ya existen poules');
      await this.deleteByEvent(eventId);
    }

    const input = event.registrations.map(r => ({
      fencerId: r.fencer.id,
      seedRank: r.seedRank,
      clubId: r.fencer.clubId,
      countryId: r.fencer.countryId,
    }));

    const { pools, unresolvedClubConflicts } = generatePools(input, manualPoolCount);

    const createdPools = await this.prisma.$transaction(
      pools.map((p, i) =>
        this.prisma.pool.create({
          data: {
            eventId,
            poolNumber: i + 1,
            assignments: {
              create: p.map(f => ({ fencerId: f.fencerId })),
            },
          },
          include: { assignments: { include: { fencer: { include: { club: true, country: true } } } } },
        })
      )
    );

    return { pools: createdPools, poolSizes: pools.map(p => p.length), unresolvedClubConflicts };
  }

  async findByEvent(eventId: number) {
    return this.prisma.pool.findMany({
      where: { eventId },
      include: { 
        assignments: { include: { fencer: { include: { club: true, country: true } } } },
        bouts: true 
      },
      orderBy: { poolNumber: 'asc' },
    });
  }

  async deleteByEvent(eventId: number) {
    await this.prisma.poolBout.deleteMany({ where: { pool: { eventId } } });
    await this.prisma.poolAssignment.deleteMany({ where: { pool: { eventId } } });
    return this.prisma.pool.deleteMany({ where: { eventId } });
  }

  // --- NUEVA LÓGICA DE BACKEND ---

  async savePoolScores(poolId: number, dto: SaveScoresDto) {
    const pool = await this.prisma.pool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Poule no encontrada');

    // Usamos una transacción para guardar todos los asaltos de una vez
    return this.prisma.$transaction(async (tx) => {
      // Borramos los asaltos previos de esta poule para evitar duplicados
      await tx.poolBout.deleteMany({ where: { poolId } });

      // Insertamos los nuevos resultados
      if (dto.bouts.length > 0) {
        await tx.poolBout.createMany({
          data: dto.bouts.map(bout => ({
            poolId,
            fencerAId: bout.fencerAId,
            fencerBId: bout.fencerBId,
            scoreA: bout.scoreA,
            scoreB: bout.scoreB,
          }))
        });
      }
      return { success: true, message: 'Resultados guardados correctamente' };
    });
  }

  async calculateEventRanking(eventId: number) {
    const pools = await this.findByEvent(eventId);
    if (!pools || pools.length === 0) return [];

    const statsMap = new Map<number, any>();

    // Inicializar el mapa con todos los inscritos
    for (const pool of pools) {
      for (const assignment of pool.assignments) {
        statsMap.set(assignment.fencerId, {
          fencer: assignment.fencer,
          poolNumber: pool.poolNumber,
          matches: 0, V: 0, TD: 0, TR: 0, Ind: 0, ratio: 0
        });
      }
    }

    // Calcular estadísticas cruzando todos los asaltos del evento
    for (const pool of pools) {
      for (const bout of pool.bouts) {
        const statA = statsMap.get(bout.fencerAId);
        const statB = statsMap.get(bout.fencerBId);

        if (statA && statB) {
          statA.matches++;
          statB.matches++;
          
          statA.TD += bout.scoreA;
          statA.TR += bout.scoreB;
          
          statB.TD += bout.scoreB;
          statB.TR += bout.scoreA;

          if (bout.scoreA > bout.scoreB) statA.V++;
          else if (bout.scoreB > bout.scoreA) statB.V++;
        }
      }
    }

    // Finalizar cálculos y ordenar FIE
    const ranking = Array.from(statsMap.values()).map(stat => {
      stat.Ind = stat.TD - stat.TR;
      stat.ratio = stat.matches > 0 ? stat.V / stat.matches : 0;
      return stat;
    });

    ranking.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio; // 1. Porcentaje de victorias
      if (b.Ind !== a.Ind) return b.Ind - a.Ind;         // 2. Indicador
      return b.TD - a.TD;                                // 3. Toques Dados
    });

    return ranking.map((stat, index) => ({ ...stat, seed: index + 1 }));
  }
}