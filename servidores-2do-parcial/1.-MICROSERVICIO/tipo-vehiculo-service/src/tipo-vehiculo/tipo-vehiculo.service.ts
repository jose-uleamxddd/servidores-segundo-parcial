import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { Outbox, OutboxStatus } from '../outbox/entities/outbox.entity';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class TipoVehiculoService {
  constructor(
    @InjectRepository(TipoVehiculo)
    private readonly tipoVehiculoRepository: Repository<TipoVehiculo>,
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Crear el tipo de vehículo
      const tipoVehiculo = this.tipoVehiculoRepository.create(createDto);
      const saved = await queryRunner.manager.save(tipoVehiculo) as unknown as TipoVehiculo;

      // 2. Insertar en la tabla Outbox (Transactional Outbox Pattern)
      const outboxEvent = this.outboxRepository.create({
        aggregateType: 'TipoVehiculo',
        aggregateId: saved.id,
        eventType: 'tipo_vehiculo.created',
        payload: {
          id: saved.id,
          nombre: saved.nombre,
          descripcion: saved.descripcion,
          capacidadPasajeros: saved.capacidadPasajeros,
          categoria: saved.categoria,
          timestamp: new Date().toISOString(),
        },
        status: OutboxStatus.PENDING,
      });

      await queryRunner.manager.save(Outbox, outboxEvent);

      // 3. Commit de la transacción
      await queryRunner.commitTransaction();

      // 4. Notificar a través de PostgreSQL NOTIFY (CDC)
      await this.notifyOutboxEvent(outboxEvent.id);

      return {
        success: true,
        data: saved,
        message: 'Tipo de vehículo creado exitosamente',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    const tiposVehiculo = await this.tipoVehiculoRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    return {
      success: true,
      data: tiposVehiculo,
      total: tiposVehiculo.length,
    };
  }

  async findOne(id: string) {
    const tipoVehiculo = await this.tipoVehiculoRepository.findOne({
      where: { id, activo: true },
    });

    if (!tipoVehiculo) {
      throw new NotFoundException(`Tipo de vehículo con ID ${id} no encontrado`);
    }

    return {
      success: true,
      data: tipoVehiculo,
    };
  }

  async update(id: string, updateDto: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tipoVehiculo = await this.tipoVehiculoRepository.findOne({
        where: { id },
      });

      if (!tipoVehiculo) {
        throw new NotFoundException(`Tipo de vehículo con ID ${id} no encontrado`);
      }

      // 1. Actualizar el tipo de vehículo
      Object.assign(tipoVehiculo, updateDto);
      const updated = await queryRunner.manager.save(tipoVehiculo) as unknown as TipoVehiculo;

      // 2. Insertar evento en Outbox
      const outboxEvent = this.outboxRepository.create({
        aggregateType: 'TipoVehiculo',
        aggregateId: updated.id,
        eventType: 'tipo_vehiculo.updated',
        payload: {
          id: updated.id,
          changes: updateDto,
          timestamp: new Date().toISOString(),
        },
        status: OutboxStatus.PENDING,
      });

      await queryRunner.manager.save(Outbox, outboxEvent);

      await queryRunner.commitTransaction();

      // 3. Notificar CDC
      await this.notifyOutboxEvent(outboxEvent.id);

      return {
        success: true,
        data: updated,
        message: 'Tipo de vehículo actualizado exitosamente',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tipoVehiculo = await this.tipoVehiculoRepository.findOne({
        where: { id },
      });

      if (!tipoVehiculo) {
        throw new NotFoundException(`Tipo de vehículo con ID ${id} no encontrado`);
      }

      // Soft delete
      tipoVehiculo.activo = false;
      const deleted = await queryRunner.manager.save(tipoVehiculo) as unknown as TipoVehiculo;

      // Insertar evento en Outbox
      const outboxEvent = this.outboxRepository.create({
        aggregateType: 'TipoVehiculo',
        aggregateId: deleted.id,
        eventType: 'tipo_vehiculo.deleted',
        payload: {
          id: deleted.id,
          timestamp: new Date().toISOString(),
        },
        status: OutboxStatus.PENDING,
      });

      await queryRunner.manager.save(Outbox, outboxEvent);

      await queryRunner.commitTransaction();

      // Notificar CDC
      await this.notifyOutboxEvent(outboxEvent.id);

      return {
        success: true,
        message: 'Tipo de vehículo eliminado exitosamente',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async validateExists(id: string) {
    const tipoVehiculo = await this.tipoVehiculoRepository.findOne({
      where: { id, activo: true },
    });

    return {
      success: true,
      exists: !!tipoVehiculo,
      data: tipoVehiculo ? { id: tipoVehiculo.id, nombre: tipoVehiculo.nombre } : null,
    };
  }

  // CDC: Notificación vía PostgreSQL NOTIFY
  private async notifyOutboxEvent(eventId: string) {
    try {
      await this.dataSource.query(
        `NOTIFY outbox_events, '${eventId}'`
      );
      console.log(`✅ CDC: Evento notificado - ${eventId}`);
    } catch (error) {
      console.error('❌ Error en NOTIFY:', error);
    }
  }
}
