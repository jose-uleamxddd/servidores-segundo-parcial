import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateVehiculoDto, UpdateVehiculoDto } from './dto/vehiculo.dto';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('vehiculo')
export class VehiculoController {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post()
  async create(@Body() createDto: CreateVehiculoDto) {
    try {
      const result = await firstValueFrom(
        this.client.send('vehiculo.create', createDto).pipe(
          timeout(10000) // Mayor timeout debido a validación asíncrona
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await firstValueFrom(
        this.client.send('vehiculo.findAll', {}).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener vehículos',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('vehiculo.findOne', { id }).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener vehículo',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateVehiculoDto) {
    try {
      const result = await firstValueFrom(
        this.client.send('vehiculo.update', { id, ...updateDto }).pipe(
          timeout(10000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al actualizar vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('vehiculo.delete', { id }).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al eliminar vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
