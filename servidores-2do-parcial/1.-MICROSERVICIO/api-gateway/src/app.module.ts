import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TipoVehiculoModule } from './tipo-vehiculo/tipo-vehiculo.module';
import { VehiculoModule } from './vehiculo/vehiculo.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'],
          queue: 'gateway_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    TipoVehiculoModule,
    VehiculoModule,
  ],
})
export class AppModule {}
