import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generatePools, SeedInput } from './pool-algorithm';

@Injectable()
export class PoolService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForEvent(eventId: number) {
    return this.prisma.pool.findMany({
      where: { eventId },
      include: {
        referee: true,
        assignments: {
          include: { fencer: { include: { club: true, country: true } } },
        },
      },
      orderBy: { poolNumber: 'asc' },
    });
  }

  async generateForEvent(eventId: number, options: { force?: boolean; poolCount?: number }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Evento con id ${eventId} no encontrado`);
    }

    const existingPools = await this.prisma.pool.findMany({ where: { eventId } });
    if (existingPools.length > 0 && !options.force) {
      throw new ConflictException(
        'Este evento ya tiene poules generadas. Usa force=true para regenerarlas (se perderán los resultados cargados).',
      );
    }

    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      include: { fencer: true },
    });

    if (registrations.length < 2) {
      throw new BadRequestException(
        'Se necesitan al menos 2 tiradores inscritos en el evento para generar poules',
      );
    }

    const seedInputs: SeedInput[] = registrations.map((r) => ({
      fencerId: r.fencerId,
      seedRank: r.seedRank,
      clubId: r.fencer.clubId,
      countryId: r.fencer.countryId,
    }));

    let result: ReturnType<typeof generatePools>;
    try {
      result = generatePools(seedInputs, options.poolCount);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    // Regeneración: se borra todo lo anterior de este evento dentro de una transacción.
    await this.prisma.$transaction(async (tx) => {
      if (existingPools.length > 0) {
        const poolIds = existingPools.map((p) => p.id);
        await tx.poolBout.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.poolAssignment.deleteMany({ where: { poolId: { in: poolIds } } });
        await tx.pool.deleteMany({ where: { eventId } });
      }

      for (let i = 0; i < result.pools.length; i++) {
        const pool = await tx.pool.create({
          data: { eventId, poolNumber: i + 1 },
        });
        await tx.poolAssignment.createMany({
          data: result.pools[i].map((f) => ({
            poolId: pool.id,
            fencerId: f.fencerId,
          })),
        });
      }
    });

    return {
      pools: await this.findAllForEvent(eventId),
      poolSizes: result.poolSizes,
      unresolvedClubConflicts: result.unresolvedClubConflicts,
    };
  }

  async removeAllForEvent(eventId: number) {
    const pools = await this.prisma.pool.findMany({ where: { eventId } });
    if (pools.length === 0) {
      throw new NotFoundException('Este evento no tiene poules generadas');
    }
    const poolIds = pools.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.poolBout.deleteMany({ where: { poolId: { in: poolIds } } }),
      this.prisma.poolAssignment.deleteMany({ where: { poolId: { in: poolIds } } }),
      this.prisma.pool.deleteMany({ where: { eventId } }),
    ]);

    return { deleted: true };
  }
}
