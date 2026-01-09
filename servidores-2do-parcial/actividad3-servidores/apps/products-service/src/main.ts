import './env.config'; // Cargar variables de entorno de Supabase
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Este microservicio SOLO escucha eventos de RabbitMQ
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@localhost:5672'],
        queue: 'events_queue',  // ← Cambiado de products_queue a events_queue
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await app.listen();
  console.log('🔧 Products Microservice is listening on RabbitMQ (events_queue)');
}
bootstrap();
