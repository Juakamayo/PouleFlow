import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoolService } from '../pool/pool.service';
import { GenerateTableauDto } from './dto/generate-tableau.dto';
import { UpdateBracketMatchDto } from './dto/update-bracket-match.dto';
import { UpdateTableauConfigDto } from './dto/update-tableau-config.dto';

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

      const existingTableau = await this.prisma.tableau.findFirst({ where: { eventId } });
      if (existingTableau) {
        await this.prisma.bracketMatch.deleteMany({ where: { tableauId: existingTableau.id } });
        await this.prisma.tableau.delete({ where: { id: existingTableau.id } });
      }

      const defaultTouches = dto.defaultTouches ?? 15;
      const overrides = dto.roundTouchesOverrides ?? {};
      const roundConfigs: Record<number, number> = {};
      let currentRoundSize = 2;
      while (currentRoundSize <= targetSize) {
        roundConfigs[currentRoundSize] = overrides[currentRoundSize] ?? defaultTouches;
        currentRoundSize *= 2;
      }

      const tableau = await this.prisma.tableau.create({
        data: { eventId, size: targetSize, roundConfigs },
      });

      // Crear matches para TODAS las rondas, no solo la primera
      let round = targetSize;
      while (round >= 2) {
        const numMatches = round / 2;
        const touches = roundConfigs[round] ?? defaultTouches;

        if (round === targetSize) {
          // Primera ronda: poblar con fencers reales
          const standardOrder = this.getTableauOrder(targetSize);
          const pairs: [number, number][] = [];
          for (let i = 0; i < standardOrder.length; i += 2) {
            pairs.push([standardOrder[i], standardOrder[i + 1]]);
          }

          for (let pos = 1; pos <= numMatches; pos++) {
            const [seedA, seedB] = pairs[pos - 1];
            const fencerA = ranking.find(r => r.seed === seedA);
            const fencerB = ranking.find(r => r.seed === seedB);

            await this.prisma.bracketMatch.create({
              data: {
                tableauId: tableau.id,
                round,
                position: pos,
                fencerAId: fencerA ? fencerA.fencer.id : null,
                fencerBId: fencerB ? fencerB.fencer.id : null,
                targetTouches: touches,
                winnerId: fencerA && !fencerB ? fencerA.fencer.id : (!fencerA && fencerB ? fencerB.fencer.id : null),
                scoreA: fencerA && !fencerB ? touches : 0,
                scoreB: !fencerA && fencerB ? touches : 0,
              },
            });
          }
        } else {
          // Rondas siguientes: crear vacías (sin fencers)
          for (let pos = 1; pos <= numMatches; pos++) {
            await this.prisma.bracketMatch.create({
              data: {
                tableauId: tableau.id,
                round,
                position: pos,
                targetTouches: touches,
              },
            });
          }
        }
        round /= 2;
      }

      // Auto-avanzar BYE winners a través del cuadro
      const allMatches = await this.prisma.bracketMatch.findMany({
        where: { tableauId: tableau.id },
      });
      for (const m of allMatches.sort((a, b) => b.round - a.round)) {
        if (m.winnerId && m.round > 2) {
          await this.advanceWinner(tableau.id, m.round, m.position, m.winnerId);
        }
      }

      return this.getTableau(eventId);
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

  async updateBracketMatch(matchId: number, dto: UpdateBracketMatchDto) {
    const match = await this.prisma.bracketMatch.findUnique({ where: { id: matchId }, include: { tableau: true } });
    if (!match) throw new NotFoundException('Combate no encontrado.');

    const data: any = {};
    if (dto.scoreA !== undefined) data.scoreA = dto.scoreA;
    if (dto.scoreB !== undefined) data.scoreB = dto.scoreB;
    if (dto.winnerId !== undefined) data.winnerId = dto.winnerId;

    let winnerId = dto.winnerId;
    if (dto.scoreA !== undefined && dto.scoreB !== undefined) {
      const target = match.targetTouches || 15;
      if (dto.scoreA >= target || dto.scoreB >= target) {
        data.status = 'COMPLETED';
        if (winnerId === undefined) {
          winnerId = dto.scoreA > dto.scoreB ? match.fencerAId : match.fencerBId;
          data.winnerId = winnerId;
        }
      }
    }

    await this.prisma.bracketMatch.update({ where: { id: matchId }, data });

    // Auto-avanzar el ganador a la siguiente ronda si hay
    if (winnerId && match.round > 2) {
      await this.advanceWinner(match.tableauId, match.round, match.position, winnerId);
    }

    return this.prisma.bracketMatch.findUnique({
      where: { id: matchId },
      include: { fencerA: { include: { club: true, country: true } }, fencerB: { include: { club: true, country: true } }, winner: true },
    });
  }

  private async advanceWinner(tableauId: number, round: number, position: number, winnerId: number) {
    const nextRound = round / 2;
    const nextPosition = Math.ceil(position / 2);
    const isOdd = position % 2 === 1;

    const nextMatch = await this.prisma.bracketMatch.findFirst({
      where: { tableauId, round: nextRound, position: nextPosition },
    });
    if (!nextMatch) return;

    const updateData: any = {};
    if (isOdd) {
      updateData.fencerAId = winnerId;
    } else {
      updateData.fencerBId = winnerId;
    }
    // Si ya estaba el otro fencer, reset para nuevo combate
    if ((isOdd && nextMatch.fencerBId) || (!isOdd && nextMatch.fencerAId)) {
      updateData.scoreA = 0;
      updateData.scoreB = 0;
      updateData.winnerId = null;
      updateData.status = 'PENDING';
    }

    await this.prisma.bracketMatch.update({ where: { id: nextMatch.id }, data: updateData });
  }

  async updateConfig(eventId: number, dto: UpdateTableauConfigDto) {
    const tableau = await this.prisma.tableau.findFirst({ where: { eventId } });
    if (!tableau) throw new NotFoundException('No hay un cuadro generado.');

    const roundConfigs = dto.roundConfigs ?? (tableau.roundConfigs as Record<number, number>);
    await this.prisma.tableau.update({
      where: { id: tableau.id },
      data: { roundConfigs },
    });

    // Actualizar targetTouches de los matches existentes
    for (const [roundStr, touches] of Object.entries(roundConfigs)) {
      const round = Number(roundStr);
      await this.prisma.bracketMatch.updateMany({
        where: { tableauId: tableau.id, round },
        data: { targetTouches: touches },
      });
    }

    return { success: true, roundConfigs };
  }

  async advanceRound(eventId: number) {
    const tableau = await this.prisma.tableau.findFirst({
      where: { eventId },
      include: { bracketMatches: true },
    });
    if (!tableau) throw new NotFoundException('No hay un cuadro generado.');

    const rounds = Object.keys(tableau.roundConfigs as Record<number, number>)
      .map(Number).sort((a, b) => b - a);

    let advanced = false;

    for (const round of rounds) {
      if (round === 2) break;

      const matches = tableau.bracketMatches
        .filter(m => m.round === round)
        .sort((a, b) => a.position - b.position);

      const hasFencers = matches.some(m => m.fencerAId !== null || m.fencerBId !== null);
      if (!hasFencers) continue;

      const nextRound = round / 2;
      const nextMatches = tableau.bracketMatches
        .filter(m => m.round === nextRound)
        .sort((a, b) => a.position - b.position);

      // Avanzar por pares: si ambos matches de un par tienen ganador, poblar el siguiente
      for (let i = 0; i < nextMatches.length; i++) {
        const matchA = matches[i * 2];
        const matchB = matches[i * 2 + 1];
        if (!matchA || !matchB) continue;

        const nextMatch = nextMatches[i];
        // Si ya tiene fencers, no sobreescribir
        if (nextMatch.fencerAId !== null && nextMatch.fencerBId !== null) continue;

        if (matchA.winnerId && matchB.winnerId) {
          await this.prisma.bracketMatch.update({
            where: { id: nextMatch.id },
            data: {
              fencerAId: matchA.winnerId,
              fencerBId: matchB.winnerId,
              scoreA: 0,
              scoreB: 0,
              winnerId: null,
              status: 'PENDING',
            },
          });
          advanced = true;
        }
      }
    }

    if (!advanced) {
      throw new ConflictException('No hay pares completos para avanzar. Completá ambos combates de un par primero.');
    }

    return this.getTableau(eventId);
  }

  async deleteTableau(eventId: number) {
    const tableau = await this.prisma.tableau.findFirst({ where: { eventId } });
    if (!tableau) throw new NotFoundException('No hay un cuadro para eliminar.');

    await this.prisma.bracketMatch.deleteMany({ where: { tableauId: tableau.id } });
    await this.prisma.tableau.delete({ where: { id: tableau.id } });
    return { success: true, message: 'Cuadro eliminado.' };
  }

  async getFinalResults(eventId: number) {
    const tableau = await this.prisma.tableau.findFirst({
      where: { eventId },
      include: { bracketMatches: { include: { fencerA: true, fencerB: true, winner: true } } },
    });
    if (!tableau) throw new NotFoundException('No hay cuadro generado.');

    const ranking = await this.poolService.calculateEventRanking(eventId);
    const poolMap = new Map(ranking.map(r => [r.fencer.id, r]));

    const finalMatch = tableau.bracketMatches.find(m => m.round === 2);
    const winner = finalMatch?.winner;

    // Mapa de ronda alcanzada por cada fencer
    const fencerRound = new Map<number, number>();
    for (const m of tableau.bracketMatches) {
      if (m.winnerId) {
        fencerRound.set(m.winnerId, m.round);
        // el perdedor llegó hasta esta ronda
        const loserId = m.fencerAId === m.winnerId ? m.fencerBId : m.fencerAId;
        if (loserId) fencerRound.set(loserId, m.round);
      }
    }

    // Obtener registrations con seedRank
    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      include: { fencer: { include: { club: true, country: true } } },
    });

    const results = registrations
      .map(reg => {
        const f = reg.fencer;
        const pool = poolMap.get(f.id);
        const roundReached = fencerRound.get(f.id) || 0;
        let placement = 999;
        if (winner?.id === f.id) placement = 1;
        else if (finalMatch && (f.id === finalMatch.fencerAId || f.id === finalMatch.fencerBId)) placement = 2;
        else if (roundReached >= 4) placement = 3;
        else if (roundReached >= 8) placement = 5;
        else if (roundReached >= 16) placement = 9;
        else if (roundReached >= 32) placement = 17;
        else if (roundReached >= 64) placement = 33;
        else placement = (pool?.seed ?? 999);

        return {
          placement,
          fencer: {
            id: f.id, firstName: f.firstName, lastName: f.lastName,
            club: f.club ? { id: f.club.id, name: f.club.name, shortCode: f.club.shortCode } : null,
            country: { id: f.country.id, name: f.country.name, iocCode: f.country.iocCode },
          },
          poolStats: pool ? {
            victories: pool.V, matches: pool.matches,
            touchesScored: pool.TD, touchesReceived: pool.TR,
            indicator: pool.Ind, ratio: pool.ratio,
            seed: pool.seed,
          } : null,
          roundReached,
        };
      })
      .sort((a, b) => a.placement - b.placement);

    return {
      eventId,
      tableauSize: tableau.size,
      champion: winner ? { id: winner.id, firstName: winner.firstName, lastName: winner.lastName } : null,
      results,
    };
  }
}