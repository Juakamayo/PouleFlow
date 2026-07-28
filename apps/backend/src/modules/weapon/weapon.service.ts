import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeaponService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.weapon.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const weapon = await this.prisma.weapon.findUnique({ where: { id } });
    if (!weapon) {
      throw new NotFoundException(`Arma con id ${id} no encontrada`);
    }
    return weapon;
  }
}
