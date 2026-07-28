import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFencerDto } from './dto/create-fencer.dto';
import { UpdateFencerDto } from './dto/update-fencer.dto';
import { FindFencersQueryDto } from './dto/find-fencers-query.dto';

@Injectable()
export class FencerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFencerDto) {
    try {
      return await this.prisma.fencer.create({
        data: dto,
        include: { club: true, country: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll(query: FindFencersQueryDto) {
    const where: Prisma.FencerWhereInput = {
      ...(query.clubId ? { clubId: query.clubId } : {}),
      ...(query.countryId ? { countryId: query.countryId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.fencer.findMany({
      where,
      include: { club: true, country: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: number) {
    const fencer = await this.prisma.fencer.findUnique({
      where: { id },
      include: { club: true, country: true },
    });
    if (!fencer) {
      throw new NotFoundException(`Tirador con id ${id} no encontrado`);
    }
    return fencer;
  }

  async update(id: number, dto: UpdateFencerDto) {
    await this.findOne(id);
    try {
      return await this.prisma.fencer.update({
        where: { id },
        data: dto,
        include: { club: true, country: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.fencer.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: el tirador tiene inscripciones, poules o resultados asociados',
        );
      }
      throw error;
    }
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003' || error.code === 'P2025') {
        const target = (error.meta?.field_name as string | undefined) ?? '';
        if (target.includes('club')) {
          return new NotFoundException('El clubId indicado no existe');
        }
        return new NotFoundException('El countryId indicado no existe');
      }
    }
    return error;
  }
}
