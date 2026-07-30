import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generatePools } from './pool-algorithm';
import { SaveScoresDto } from './dto/save-scores.dto';

@Injectable()
export class PoolService {
  constructor(private prisma: PrismaService) {}
  
  async generateForEvent(eventId: number, force = false, manualPoolCount?: number) {
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

  async savePoolScores(poolId: number, dto: SaveScoresDto) {
    const pool = await this.prisma.pool.findUnique({ where: { id: poolId }, include: { assignments: true } });
    if (!pool) throw new NotFoundException('Poule no encontrada');

    return this.prisma.$transaction(async (tx) => {
      await tx.poolBout.deleteMany({ where: { poolId } });

      if (dto.bouts.length > 0) {
        await tx.poolBout.createMany({
          data: dto.bouts.map(bout => ({
            poolId,
            fencerAId: bout.fencerAId,
            fencerBId: bout.fencerBId,
            scoreA: bout.scoreA,
            scoreB: bout.scoreB,
            boutOrder: bout.boutOrder,
          }))
        });
      }

      // Recalcular campos cacheados de PoolAssignment
      const statsMap = new Map<number, { V: number; TD: number; TR: number }>();
      for (const a of pool.assignments) {
        statsMap.set(a.fencerId, { V: 0, TD: 0, TR: 0 });
      }
      for (const bout of dto.bouts) {
        const sA = statsMap.get(bout.fencerAId);
        const sB = statsMap.get(bout.fencerBId);
        if (sA && sB) {
          sA.TD += bout.scoreA; sA.TR += bout.scoreB;
          sB.TD += bout.scoreB; sB.TR += bout.scoreA;
          if (bout.scoreA > bout.scoreB) sA.V++;
          else if (bout.scoreB > bout.scoreA) sB.V++;
        }
      }
      for (const a of pool.assignments) {
        const s = statsMap.get(a.fencerId);
        if (s) {
          await tx.poolAssignment.update({
            where: { id: a.id },
            data: {
              victories: s.V,
              touchesScored: s.TD,
              touchesReceived: s.TR,
              indicator: s.TD - s.TR,
            },
          });
        }
      }

      return { success: true, message: 'Resultados guardados correctamente' };
    });
  }

  async calculateEventRanking(eventId: number) {
    const pools = await this.findByEvent(eventId);
    if (!pools || pools.length === 0) return [];

    const statsMap = new Map<number, any>();

    for (const pool of pools) {
      for (const assignment of pool.assignments) {
        statsMap.set(assignment.fencerId, {
          fencer: assignment.fencer,
          poolNumber: pool.poolNumber,
          matches: 0, V: 0, TD: 0, TR: 0, Ind: 0, ratio: 0
        });
      }
    }

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

    const ranking = Array.from(statsMap.values()).map(stat => {
      stat.Ind = stat.TD - stat.TR;
      stat.ratio = stat.matches > 0 ? stat.V / stat.matches : 0;
      return stat;
    });

    ranking.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio; 
      if (b.Ind !== a.Ind) return b.Ind - a.Ind;         
      return b.TD - a.TD;                                
    });

    return ranking.map((stat, index) => ({ ...stat, seed: index + 1 }));
  }
}