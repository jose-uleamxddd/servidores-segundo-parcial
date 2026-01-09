import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('order.create')
  async createOrder(@Payload() data: any) {
    console.log('📥 Received command: order.create', data);
    return await this.ordersService.createOrder(data);
  }

  @MessagePattern('order.get')
  async getOrder(@Payload() data: { id: number }) {
    console.log('📥 Received command: order.get', data);
    return await this.ordersService.findOne(data.id);
  }

  @EventPattern('product.stock.reserved')
  async handleStockReserved(
    @Payload()
    data: {
      orderId: number;
      success: boolean;  // ← DEBE SER success, no reserved
      reason?: string;
    },
  ) {
    console.log('🎧 Received event: product.stock.reserved', data);
    await this.ordersService.updateOrderStatus(data);
  }
}
