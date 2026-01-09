import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Vehiculo } from './entities/vehiculo.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
import { firstValueFrom, timeout } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VehiculoService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(ProcessedEvent)
    private readonly processedEventRepository: Repository<ProcessedEvent>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) {}

  async create(createDto: any) {
    try {
      // 1. Validar tipo de vehículo vía RabbitMQ (comunicación asíncrona obligatoria)
      console.log(`🔍 Validando tipo de vehículo: ${createDto.tipoVehiculoId}`);
      
      const validationResult = await firstValueFrom(
        this.rabbitClient.send('tipo_vehiculo.validate', {
          id: createDto.tipoVehiculoId,
        }).pipe(timeout(5000))
      );

      if (!validationResult.exists) {
        throw new BadRequestException(
          `El tipo de vehículo con ID ${createDto.tipoVehiculoId} no existe o no está activo`
        );
      }

      // 2. Crear el vehículo con información del tipo (cache)
      const vehiculo = this.vehiculoRepository.create({
        ...createDto,
        tipoVehiculoNombre: validationResult.data?.nombre || null,
      });

      const saved = await this.vehiculoRepository.save(vehiculo) as unknown as Vehiculo;

      console.log(`✅ Vehículo creado exitosamente: ${saved.id}`);

      return {
        success: true,
        data: saved,
        message: 'Vehículo creado exitosamente',
      };
    } catch (error) {
      console.error('❌ Error al crear vehículo:', error);
      throw error;
    }
  }

  async findAll() {
    const vehiculos = await this.vehiculoRepository.find({
      where: { activo: true },
      order: { placa: 'ASC' },
    });

    return {
      success: true,
      data: vehiculos,
      total: vehiculos.length,
    };
  }

  async findOne(id: string) {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { id, activo: true },
    });

    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
    }

    return {
      success: true,
      data: vehiculo,
    };
  }

  async update(id: string, updateDto: any) {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { id },
    });

    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
    }

    // Si se actualiza el tipo de vehículo, validar vía RabbitMQ
    if (updateDto.tipoVehiculoId && updateDto.tipoVehiculoId !== vehiculo.tipoVehiculoId) {
      const validationResult = await firstValueFrom(
        this.rabbitClient.send('tipo_vehiculo.validate', {
          id: updateDto.tipoVehiculoId,
        }).pipe(timeout(5000))
      );

      if (!validationResult.exists) {
        throw new BadRequestException(
          `El tipo de vehículo con ID ${updateDto.tipoVehiculoId} no existe o no está activo`
        );
      }

      updateDto.tipoVehiculoNombre = validationResult.data?.nombre || null;
    }

    Object.assign(vehiculo, updateDto);
    const updated = await this.vehiculoRepository.save(vehiculo);

    return {
      success: true,
      data: updated,
      message: 'Vehículo actualizado exitosamente',
    };
  }

  async remove(id: string) {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { id },
    });

    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado`);
    }

    // Soft delete
    vehiculo.activo = false;
    await this.vehiculoRepository.save(vehiculo);

    return {
      success: true,
      message: 'Vehículo eliminado exitosamente',
    };
  }

  // Actualizar cache del nombre del tipo de vehículo
  async updateTipoVehiculoCache(eventData: any) {
    try {
      const tipoId = eventData.id;
      const nuevoNombre = eventData.changes?.nombre;

      if (nuevoNombre) {
        await this.vehiculoRepository.update(
          { tipoVehiculoId: tipoId },
          { tipoVehiculoNombre: nuevoNombre }
        );

        console.log(`✅ Cache actualizado para tipo de vehículo: ${tipoId}`);
      }
    } catch (error) {
      console.error('❌ Error al actualizar cache:', error);
    }
  }

  // Manejar eliminación de tipo de vehículo
  async handleTipoVehiculoDeleted(eventData: any) {
    try {
      const tipoId = eventData.id;

      // Marcar vehículos como inactivos si su tipo fue eliminado
      await this.vehiculoRepository.update(
        { tipoVehiculoId: tipoId, activo: true },
        { activo: false }
      );

      console.log(`⚠️ Vehículos desactivados por eliminación de tipo: ${tipoId}`);
    } catch (error) {
      console.error('❌ Error al manejar eliminación de tipo:', error);
    }
  }

  // Idempotencia: Verificar si un evento ya fue procesado
  async isEventProcessed(eventId: string): Promise<boolean> {
    const processed = await this.processedEventRepository.findOne({
      where: { eventId },
    });
    return !!processed;
  }

  // Marcar evento como procesado
  async markEventAsProcessed(eventId: string, eventType: string, payload: any) {
    const processedEvent = this.processedEventRepository.create({
      eventId,
      eventType,
      payload,
    });
    await this.processedEventRepository.save(processedEvent);
  }
}
