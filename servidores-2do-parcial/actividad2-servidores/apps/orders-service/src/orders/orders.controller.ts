import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Recibe el mensaje "order.create" del API Gateway (vía RabbitMQ)
   * Este es el ÚNICO punto de entrada HTTP → RabbitMQ
   */
  @MessagePattern('order.create')
  async createOrder(@Payload() data: { productId: number; quantity: number }) {
    console.log('🎧 Received message: order.create', data);
    const order = await this.ordersService.createOrder(data.productId, data.quantity);
    return order;
  }

  /**
   * Escucha el evento "product.stock.reserved" publicado por el microservicio de Productos
   * Actualiza el estado del pedido según el resultado
   */
  @EventPattern('product.stock.reserved')
  async handleStockReserved(
    @Payload() data: { orderId: number; success: boolean; reason?: string },
  ) {
    console.log('🎧 Received event: product.stock.reserved', data);
    await this.ordersService.updateOrderStatus(data);
  }
}
