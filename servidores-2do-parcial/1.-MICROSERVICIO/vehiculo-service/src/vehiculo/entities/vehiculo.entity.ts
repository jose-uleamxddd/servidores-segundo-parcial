import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehiculo')
export class Vehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  placa: string;

  @Column({ type: 'varchar', length: 50 })
  marca: string;

  @Column({ type: 'varchar', length: 50 })
  modelo: string;

  @Column({ type: 'int' })
  anio: number;

  @Column({ type: 'varchar', length: 30 })
  color: string;

  @Column({ type: 'uuid' })
  tipoVehiculoId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipoVehiculoNombre: string; // Cache del nombre del tipo

  @Column({ type: 'varchar', length: 100, nullable: true })
  numeroSerie: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
