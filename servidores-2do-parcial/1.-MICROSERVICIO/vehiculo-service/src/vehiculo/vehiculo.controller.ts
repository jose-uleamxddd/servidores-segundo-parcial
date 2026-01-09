import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { VehiculoService } from './vehiculo.service';

@Controller()
export class VehiculoController {
  constructor(private readonly vehiculoService: VehiculoService) {}

  @MessagePattern('vehiculo.create')
  async create(@Payload() data: any) {
    return await this.vehiculoService.create(data);
  }

  @MessagePattern('vehiculo.findAll')
  async findAll() {
    return await this.vehiculoService.findAll();
  }

  @MessagePattern('vehiculo.findOne')
  async findOne(@Payload() data: { id: string }) {
    return await this.vehiculoService.findOne(data.id);
  }

  @MessagePattern('vehiculo.update')
  async update(@Payload() data: any) {
    const { id, ...updateData } = data;
    return await this.vehiculoService.update(id, updateData);
  }

  @MessagePattern('vehiculo.delete')
  async remove(@Payload() data: { id: string }) {
    return await this.vehiculoService.remove(data.id);
  }

  // Event listeners para eventos de Tipo Vehículo
  @EventPattern('tipo_vehiculo.created')
  async handleTipoVehiculoCreated(@Payload() data: any) {
    console.log('📨 Evento recibido: tipo_vehiculo.created', data);
    // Aquí se puede actualizar cache o realizar otras acciones
  }

  @EventPattern('tipo_vehiculo.updated')
  async handleTipoVehiculoUpdated(@Payload() data: any) {
    console.log('📨 Evento recibido: tipo_vehiculo.updated', data);
    await this.vehiculoService.updateTipoVehiculoCache(data);
  }

  @EventPattern('tipo_vehiculo.deleted')
  async handleTipoVehiculoDeleted(@Payload() data: any) {
    console.log('📨 Evento recibido: tipo_vehiculo.deleted', data);
    await this.vehiculoService.handleTipoVehiculoDeleted(data);
  }
}
