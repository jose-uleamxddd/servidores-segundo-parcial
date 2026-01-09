import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Product } from './products/entities/product.entity';
import { ProcessedEvent } from './products/entities/processed-event.entity';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { WebhookModule } from '../../shared/webhook.module';

@Module({
  imports: [
    // Conexión a la base de datos MySQL del microservicio de productos
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'products_db',
      entities: [Product, ProcessedEvent],
      synchronize: true, // Solo para desarrollo
    }),
    TypeOrmModule.forFeature([Product, ProcessedEvent]),
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
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class AppModule {}
