import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Product } from './entities/product.entity';
import { ProcessedEvent } from './entities/processed-event.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProcessedEvent)
    private processedEventRepository: Repository<ProcessedEvent>,
    @Inject('EVENTS_SERVICE') private eventsClient: ClientProxy,
  ) {}

  /**
   * Procesa la solicitud de reserva de stock con IDEMPOTENCIA
   * Este método es llamado cuando el microservicio escucha el evento "order.stock.requested"
   * 
   * GARANTÍA DE IDEMPOTENCIA:
   * - Verifica si el eventId ya fue procesado antes
   * - Si ya existe, retorna silenciosamente sin modificar el stock
   * - Si es nuevo, procesa y registra el eventId en la tabla processed_events
   */
  async processStockRequest(payload: {
    eventId: string;
    orderId: number;
    productId: number;
    quantity: number;
  }): Promise<void> {
    const { eventId, orderId, productId, quantity } = payload;

    console.log(`📦 Received stock request - EventId: ${eventId}, Order: ${orderId}, Product: ${productId}, Quantity: ${quantity}`);

    // ========================================
    // PASO 1: VERIFICAR IDEMPOTENCIA
    // ========================================
    const alreadyProcessed = await this.processedEventRepository.findOne({
      where: { eventId },
    });

    if (alreadyProcessed) {
      console.log(`⚠️ Event ${eventId} already processed at ${alreadyProcessed.processedAt}. Skipping duplicate.`);
      return; // Retornar silenciosamente - NO ejecutar lógica de negocio
    }

    // ========================================
    // PASO 2: EJECUTAR LÓGICA DE NEGOCIO
    // ========================================
    console.log(`✅ Event ${eventId} is new. Processing...`);

    // Buscar el producto en la base de datos
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      console.log(`❌ Product ${productId} not found`);
      
      // Registrar evento como procesado aunque haya fallado
      await this.processedEventRepository.save({
        eventId,
        eventType: 'order.stock.requested',
        payload: { orderId, productId, quantity, result: 'product_not_found' },
      });

      // Publicar evento de rechazo
      this.eventsClient.emit('product.stock.reserved', {
        orderId,
        productId,
        quantity,
        success: false,
        reason: 'Product not found',
      });
      return;
    }

    // Verificar si hay stock suficiente
    if (product.stock < quantity) {
      console.log(`❌ Insufficient stock for Product ${productId}. Available: ${product.stock}, Requested: ${quantity}`);
      
      // Registrar evento como procesado
      await this.processedEventRepository.save({
        eventId,
        eventType: 'order.stock.requested',
        payload: { orderId, productId, quantity, result: 'insufficient_stock' },
      });

      // Publicar evento de rechazo
      this.eventsClient.emit('product.stock.reserved', {
        orderId,
        productId,
        quantity,
        success: false,
        reason: 'Insufficient stock',
      });
      return;
    }

    // ========================================
    // PASO 3: REDUCIR STOCK (OPERACIÓN CRÍTICA)
    // ========================================
    const previousStock = product.stock;
    product.stock -= quantity;
    await this.productRepository.save(product);

    console.log(`✅ Stock reduced for Product ${productId}: ${previousStock} → ${product.stock}`);

    // ========================================
    // PASO 4: REGISTRAR EVENTO COMO PROCESADO
    // ========================================
    await this.processedEventRepository.save({
      eventId,
      eventType: 'order.stock.requested',
      payload: { orderId, productId, quantity, result: 'success', previousStock, newStock: product.stock },
    });

    console.log(`🔐 Event ${eventId} marked as processed in database`);

    // ========================================
    // PASO 5: PUBLICAR EVENTO DE ÉXITO
    // ========================================
    this.eventsClient.emit('product.stock.reserved', {
      orderId,
      productId,
      quantity,
      success: true,
      newStock: product.stock,
    });

    console.log(`📤 Event published: product.stock.reserved (success)`);
  }

  /**
   * Crear un producto inicial (para pruebas)
   */
  async createProduct(name: string, price: number, stock: number): Promise<Product> {
    const product = this.productRepository.create({ name, price, stock });
    return await this.productRepository.save(product);
  }

  /**
   * Obtener todos los productos
   */
  async findAll(): Promise<Product[]> {
    return await this.productRepository.find();
  }
}
