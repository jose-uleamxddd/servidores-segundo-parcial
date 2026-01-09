import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Escucha el evento "order.stock.requested" publicado por el microservicio de Pedidos
   * NO hay endpoints HTTP en este microservicio
   */
  @EventPattern('order.stock.requested')
  async handleStockRequest(
    @Payload()
    data: {
      eventId: string;
      orderId: number;
      productId: number;
      quantity: number;
    },
  ) {
    console.log('🎧 Received event: order.stock.requested', data);
    await this.productsService.processStockRequest(data);
  }
}
