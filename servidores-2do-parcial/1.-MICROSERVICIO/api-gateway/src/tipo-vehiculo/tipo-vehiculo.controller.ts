import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateTipoVehiculoDto, UpdateTipoVehiculoDto } from './dto/tipo-vehiculo.dto';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('tipo-vehiculo')
export class TipoVehiculoController {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post()
  async create(@Body() createDto: CreateTipoVehiculoDto) {
    try {
      const result = await firstValueFrom(
        this.client.send('tipo_vehiculo.create', createDto).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear tipo de vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll() {
    try {
      const result = await firstValueFrom(
        this.client.send('tipo_vehiculo.findAll', {}).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener tipos de vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('tipo_vehiculo.findOne', { id }).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener tipo de vehículo',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateTipoVehiculoDto) {
    try {
      const result = await firstValueFrom(
        this.client.send('tipo_vehiculo.update', { id, ...updateDto }).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al actualizar tipo de vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.client.send('tipo_vehiculo.delete', { id }).pipe(
          timeout(5000)
        )
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al eliminar tipo de vehículo',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
