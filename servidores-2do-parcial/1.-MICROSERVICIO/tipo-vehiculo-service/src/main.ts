import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'],
      queue: 'tipo_vehiculo_queue',
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.startAllMicroservices();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚗 Tipo Vehículo Service running on: http://localhost:${port}`);
  console.log(`📡 RabbitMQ Queue: tipo_vehiculo_queue`);
  console.log(`🗄️  Database: ${process.env.DATABASE_NAME}`);
}

bootstrap();
