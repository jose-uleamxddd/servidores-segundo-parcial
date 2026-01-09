import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Tabla de control para idempotencia
 * Registra todos los eventos procesados para evitar duplicados
 */
@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  eventId: string;

  @Column({ length: 50 })
  eventType: string;

  @Column({ type: 'json', nullable: true })
  payload: any;

  @CreateDateColumn()
  processedAt: Date;
}
