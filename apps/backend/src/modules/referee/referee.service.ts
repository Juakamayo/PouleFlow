import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefereeDto } from './dto/create-referee.dto';
import { UpdateRefereeDto } from './dto/update-referee.dto';

@Injectable()
export class RefereeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRefereeDto) {
    try {
      return await this.prisma.referee.create({
        data: dto,
        include: { country: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll() {
    return this.prisma.referee.findMany({
      include: { country: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: number) {
    const referee = await this.prisma.referee.findUnique({
      where: { id },
      include: { country: true },
    });
    if (!referee) {
      throw new NotFoundException(`Árbitro con id ${id} no encontrado`);
    }
    return referee;
  }

  async update(id: number, dto: UpdateRefereeDto) {
    await this.findOne(id);
    try {
      return await this.prisma.referee.update({
        where: { id },
        data: dto,
        include: { country: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.referee.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: el árbitro tiene poules o eliminatorias asignadas',
        );
      }
      throw error;
    }
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003' || error.code === 'P2025') {
        return new NotFoundException('El countryId indicado no existe');
      }
    }
    return error;
  }
}
