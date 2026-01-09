import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TipoVehiculoController } from './tipo-vehiculo.controller';
import { TipoVehiculoService } from './tipo-vehiculo.service';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { Outbox } from '../outbox/entities/outbox.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoVehiculo, Outbox]),
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'],
          queue: 'events_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [TipoVehiculoController],
  providers: [TipoVehiculoService],
  exports: [TipoVehiculoService],
})
export class TipoVehiculoModule {}
