import { Controller, Get, Query, Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCTS_SERVICE') private productsClient: ClientProxy,
  ) {}

  @Get()
  async getAllProducts() {
    // Obtener todos los productos del inventario
    const result = await firstValueFrom(
      this.productsClient.send('product.getAll', {})
    );
    return result;
  }

  @Get('search')
  async searchProducts(@Query('name') name: string) {
    if (!name) {
      return { error: 'Name parameter is required' };
    }

    // Buscar productos por nombre
    const result = await firstValueFrom(
      this.productsClient.send('product.search', { name })
    );
    
    return result;
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    // Obtener un producto por ID
    const result = await firstValueFrom(
      this.productsClient.send('product.get', { id: parseInt(id) })
    );
    return result;
  }
}
