import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Outbox, OutboxStatus } from './entities/outbox.entity';
import { Client } from 'pg';

@Injectable()
export class OutboxService implements OnModuleInit {
  private pgClient: Client;

  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Iniciar el listener de PostgreSQL NOTIFY/LISTEN (CDC)
    await this.initializeCDCListener();
    
    // Procesar eventos pendientes al iniciar
    await this.processPendingEvents();
  }

  // CDC: Configurar LISTEN para eventos de Outbox
  private async initializeCDCListener() {
    try {
      const config = this.dataSource.options as any;
      
      this.pgClient = new Client({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      });

      await this.pgClient.connect();

      // Escuchar el canal 'outbox_events'
      await this.pgClient.query('LISTEN outbox_events');

      this.pgClient.on('notification', async (msg) => {
        if (msg.channel === 'outbox_events') {
          const eventId = msg.payload;
          console.log(`📨 CDC: Nuevo evento recibido - ${eventId}`);
          await this.processEvent(eventId);
        }
      });

      console.log('🎧 CDC Listener iniciado - Escuchando canal: outbox_events');
    } catch (error) {
      console.error('❌ Error al inicializar CDC Listener:', error);
    }
  }

  // Procesar un evento específico del Outbox
  private async processEvent(eventId: string) {
    try {
      const event = await this.outboxRepository.findOne({
        where: { id: eventId, status: OutboxStatus.PENDING },
      });

      if (!event) {
        console.log(`⚠️ Evento ${eventId} ya procesado o no encontrado`);
        return;
      }

      // Publicar a RabbitMQ
      await this.rabbitClient.emit(event.eventType, event.payload).toPromise();

      // Actualizar estado del evento
      event.status = OutboxStatus.PUBLISHED;
      event.publishedAt = new Date();
      await this.outboxRepository.save(event);

      console.log(`✅ Evento publicado: ${event.eventType} - ID: ${eventId}`);
    } catch (error) {
      console.error(`❌ Error al procesar evento ${eventId}:`, error);
      
      // Marcar como fallido y incrementar contador de reintentos
      const event = await this.outboxRepository.findOne({
        where: { id: eventId },
      });

      if (event) {
        event.status = OutboxStatus.FAILED;
        event.retryCount += 1;
        event.errorMessage = error.message;
        await this.outboxRepository.save(event);
      }
    }
  }

  // Procesar eventos pendientes (al iniciar el servicio)
  private async processPendingEvents() {
    try {
      const pendingEvents = await this.outboxRepository.find({
        where: { status: OutboxStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 100, // Procesar máximo 100 eventos pendientes
      });

      console.log(`📋 Eventos pendientes encontrados: ${pendingEvents.length}`);

      for (const event of pendingEvents) {
        await this.processEvent(event.id);
      }
    } catch (error) {
      console.error('❌ Error al procesar eventos pendientes:', error);
    }
  }

  // Reintentar eventos fallidos
  async retryFailedEvents() {
    const failedEvents = await this.outboxRepository.find({
      where: { status: OutboxStatus.FAILED },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    console.log(`🔄 Reintentando ${failedEvents.length} eventos fallidos`);

    for (const event of failedEvents) {
      if (event.retryCount < 3) { // Máximo 3 reintentos
        event.status = OutboxStatus.PENDING;
        await this.outboxRepository.save(event);
        await this.processEvent(event.id);
      }
    }
  }
}
