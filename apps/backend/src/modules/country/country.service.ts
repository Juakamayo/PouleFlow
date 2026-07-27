import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCountryDto) {
    try {
      return await this.prisma.country.create({ data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un país con ese nombre o código IOC');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) {
      throw new NotFoundException(`País con id ${id} no encontrado`);
    }
    return country;
  }

  async update(id: number, dto: UpdateCountryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.country.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un país con ese nombre o código IOC');
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.country.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'No se puede eliminar: hay clubes o tiradores asociados a este país',
        );
      }
      throw error;
    }
  }
}
