import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentService {
  constructor(private readonly prisma: PrismaService) {}

  private assertValidDateRange(startDate: string, endDate: string) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('endDate no puede ser anterior a startDate');
    }
  }

  async create(dto: CreateTournamentDto) {
    this.assertValidDateRange(dto.startDate, dto.endDate);
    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        location: dto.location,
      },
    });
  }

  findAll() {
    return this.prisma.tournament.findMany({ orderBy: { startDate: 'desc' } });
  }

  async findOne(id: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { events: { include: { weapon: true, category: true } } },
    });
    if (!tournament) {
      throw new NotFoundException(`Torneo con id ${id} no encontrado`);
    }
    return tournament;
  }

  async update(id: number, dto: UpdateTournamentDto) {
    const current = await this.findOne(id);
    const startDate = dto.startDate ?? current.startDate.toISOString();
    const endDate = dto.endDate ?? current.endDate.toISOString();
    this.assertValidDateRange(startDate, endDate);

    return this.prisma.tournament.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.tournament.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('No se puede eliminar: el torneo tiene eventos asociados');
      }
      throw error;
    }
  }
}
