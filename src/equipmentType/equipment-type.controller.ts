import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EquipmentTypeService } from './equipment-type.service';

@Controller('equipment-types')
@UseGuards(JwtAuthGuard)
export class EquipmentTypeController {
  constructor(private readonly equipmentTypeService: EquipmentTypeService) {}

  @Get()
  findAll() {
    return this.equipmentTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentTypeService.findOne(id);
  }
}
