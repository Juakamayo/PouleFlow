import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const eventInclude = {
  tournament: true,
  weapon: true,
  category: true,
} satisfies Prisma.EventInclude;

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    try {
      return await this.prisma.event.create({
        data: dto,
        include: eventInclude,
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll(tournamentId?: number) {
    return this.prisma.event.findMany({
      where: tournamentId ? { tournamentId } : undefined,
      include: eventInclude,
      orderBy: [{ weapon: { name: 'asc' } }, { category: { name: 'asc' } }],
    });
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    return event;
  }

  async update(id: number, dto: UpdateEventDto) {
    await this.findOne(id);
    try {
      return await this.prisma.event.update({
        where: { id },
        data: dto,
        include: eventInclude,
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.event.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: el evento tiene inscripciones, poules o llaves asociadas',
        );
      }
      throw error;
    }
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Ya existe un evento con esa combinación de arma, categoría y género en este torneo',
        );
      }
      if (error.code === 'P2003' || error.code === 'P2025') {
        return new NotFoundException('tournamentId, weaponId o categoryId indicado no existe');
      }
    }
    return error;
  }
}
