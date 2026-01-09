import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Order } from './orders/entities/order.entity';
import { OrdersService } from './orders/orders.service';
import { OrdersController } from './orders/orders.controller';
import { WebhookModule } from '../../shared/webhook.module';

@Module({
  imports: [
    // Conexión a la base de datos MySQL del microservicio de pedidos (puerto 3307)
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3307,
      username: 'root',
      password: 'root',
      database: 'orders_db',
      entities: [Order],
      synchronize: true, // Solo para desarrollo
    }),
    TypeOrmModule.forFeature([Order]),
    WebhookModule, // Módulo de webhooks
    // Cliente RabbitMQ para publicar eventos
    ClientsModule.register([
      {
        name: 'EVENTS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin@localhost:5672'],
          queue: 'events_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class AppModule {}
