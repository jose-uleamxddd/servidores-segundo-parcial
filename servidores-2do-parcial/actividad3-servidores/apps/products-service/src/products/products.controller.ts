import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Obtener todos los productos
   */
  @MessagePattern('product.getAll')
  async getAllProducts() {
    return await this.productsService.findAll();
  }

  /**
   * Buscar productos por nombre
   */
  @MessagePattern('product.search')
  async searchProducts(@Payload() data: { name: string }) {
    return await this.productsService.searchByName(data.name);
  }

  /**
   * Obtener producto por ID
   */
  @MessagePattern('product.get')
  async getProduct(@Payload() data: { id: number }) {
    return await this.productsService.findOne(data.id);
  }

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
