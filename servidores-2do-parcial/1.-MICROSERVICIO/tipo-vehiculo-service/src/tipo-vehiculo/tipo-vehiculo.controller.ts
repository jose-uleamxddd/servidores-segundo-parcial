import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TipoVehiculoService } from './tipo-vehiculo.service';

@Controller()
export class TipoVehiculoController {
  constructor(private readonly tipoVehiculoService: TipoVehiculoService) {}

  @MessagePattern('tipo_vehiculo.create')
  async create(@Payload() data: any) {
    return await this.tipoVehiculoService.create(data);
  }

  @MessagePattern('tipo_vehiculo.findAll')
  async findAll() {
    return await this.tipoVehiculoService.findAll();
  }

  @MessagePattern('tipo_vehiculo.findOne')
  async findOne(@Payload() data: { id: string }) {
    return await this.tipoVehiculoService.findOne(data.id);
  }

  @MessagePattern('tipo_vehiculo.update')
  async update(@Payload() data: any) {
    const { id, ...updateData } = data;
    return await this.tipoVehiculoService.update(id, updateData);
  }

  @MessagePattern('tipo_vehiculo.delete')
  async remove(@Payload() data: { id: string }) {
    return await this.tipoVehiculoService.remove(data.id);
  }

  @MessagePattern('tipo_vehiculo.validate')
  async validate(@Payload() data: { id: string }) {
    return await this.tipoVehiculoService.validateExists(data.id);
  }
}
