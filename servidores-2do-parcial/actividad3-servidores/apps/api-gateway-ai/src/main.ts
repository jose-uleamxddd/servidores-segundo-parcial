import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir archivos estáticos desde la carpeta public del proyecto raíz
  const publicPath = join(__dirname, '..', '..', '..', 'public');
  app.useStaticAssets(publicPath);
  logger.log(`📁 Sirviendo archivos estáticos desde: ${publicPath}`);

  // Habilitar CORS
  app.enableCors();

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;

  await app.listen(port);

  logger.log('\n' + '='.repeat(60));
  logger.log('🤖 API GATEWAY AI CON GEMINI - INICIADO');
  logger.log('='.repeat(60));
  logger.log(`Puerto: ${port}`);
  logger.log(`MCP Server: ${process.env.MCP_SERVER_URL || 'http://localhost:3001'}`);
  logger.log(`Gemini API: ${process.env.GEMINI_API_KEY ? 'Configurada ✅' : 'No configurada ❌'}`);
  logger.log('\nEndpoints:');
  logger.log(`  - GET  /           - Interfaz Web Gráfica 🎨`);
  logger.log(`  - POST /ai/ask     - Hacer preguntas a la IA`);
  logger.log(`  - GET  /ai/tools   - Listar tools disponibles`);
  logger.log(`  - GET  /ai/health  - Estado del sistema`);
  logger.log('\n🌐 Accede a la interfaz web en: http://localhost:${port}');
  logger.log('='.repeat(60) + '\n');
}

bootstrap();
