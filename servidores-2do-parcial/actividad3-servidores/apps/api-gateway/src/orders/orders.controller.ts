import { Controller, Post, Get, Param, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { firstValueFrom } from 'rxjs';

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDERS_SERVICE') private ordersClient: ClientProxy,
  ) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    // El API Gateway recibe la petición HTTP y la envía al microservicio de Pedidos vía RabbitMQ
    const result = await firstValueFrom(
      this.ordersClient.send('order.create', createOrderDto)
    );
    
    return {
      message: 'Order created successfully',
      data: result,
    };
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    // Obtener un pedido por ID
    const result = await firstValueFrom(
      this.ordersClient.send('order.get', { id: parseInt(id) })
    );
    return result;
  }
}
