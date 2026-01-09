import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('processed_events')
@Index(['eventId'], { unique: true })
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  eventId: string; // ID del evento para idempotencia

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @CreateDateColumn()
  processedAt: Date;
}
