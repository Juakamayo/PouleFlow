import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClubDto) {
    try {
      return await this.prisma.club.create({ data: dto });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll() {
    return this.prisma.club.findMany({
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: { country: true },
    });
    if (!club) {
      throw new NotFoundException(`Club con id ${id} no encontrado`);
    }
    return club;
  }

  async update(id: number, dto: UpdateClubDto) {
    await this.findOne(id);
    try {
      return await this.prisma.club.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.club.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: hay tiradores asociados a este club',
        );
      }
      throw error;
    }
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Ya existe un club con ese nombre en ese país');
      }
      if (error.code === 'P2003' || error.code === 'P2025') {
        return new NotFoundException('El countryId indicado no existe');
      }
    }
    return error;
  }
}
