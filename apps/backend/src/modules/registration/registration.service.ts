import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';

const registrationInclude = {
  fencer: { include: { club: true, country: true } },
  event: { include: { weapon: true, category: true } },
} satisfies Prisma.RegistrationInclude;

@Injectable()
export class RegistrationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRegistrationDto) {
    try {
      return await this.prisma.registration.create({
        data: dto,
        include: registrationInclude,
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll(eventId?: number) {
    return this.prisma.registration.findMany({
      where: eventId ? { eventId } : undefined,
      include: registrationInclude,
      orderBy: [{ seedRank: 'asc' }, { fencer: { lastName: 'asc' } }],
    });
  }

  async findOne(id: number) {
    const registration = await this.prisma.registration.findUnique({
      where: { id },
      include: registrationInclude,
    });
    if (!registration) {
      throw new NotFoundException(`Inscripción con id ${id} no encontrada`);
    }
    return registration;
  }

  async update(id: number, dto: UpdateRegistrationDto) {
    await this.findOne(id);
    return this.prisma.registration.update({
      where: { id },
      data: dto,
      include: registrationInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.registration.delete({ where: { id } });
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Este tirador ya está inscrito en este evento');
      }
      if (error.code === 'P2003' || error.code === 'P2025') {
        return new NotFoundException('El eventId o fencerId indicado no existe');
      }
    }
    return error;
  }
}
