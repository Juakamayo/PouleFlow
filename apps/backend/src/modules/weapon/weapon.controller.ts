import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WeaponService } from './weapon.service';

@Controller('weapons')
export class WeaponController {
  constructor(private readonly weaponService: WeaponService) {}

  @Get()
  findAll() {
    return this.weaponService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.weaponService.findOne(id);
  }
}
