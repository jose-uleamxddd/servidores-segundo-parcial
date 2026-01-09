import './env.config'; // Cargar variables de entorno de Supabase
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Crear app híbrida que escucha múltiples colas
  const app = await NestFactory.create(AppModule);

  // Escuchar mensajes del API Gateway (orders_queue)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Escuchar eventos de otros microservicios (events_queue)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'events_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  console.log('📝 Orders Microservice is listening on:');
  console.log('   - orders_queue (Gateway commands)');
  console.log('   - events_queue (Product events)');
}
bootstrap();
