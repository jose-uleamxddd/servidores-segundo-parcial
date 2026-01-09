import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Order, OrderStatus } from './entities/order.entity';
import { v4 as uuidv4 } from 'uuid';
import { WebhookPublisherService } from '../../../shared/webhook-publisher.service';
import { WebhookEventType, OrderCreatedData } from '../../../shared/webhook-events.types';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @Inject('EVENTS_SERVICE') private eventsClient: ClientProxy,
    private webhookPublisher: WebhookPublisherService,
  ) {}

  /**
   * Crea un nuevo pedido con estado PENDING
   * y publica un evento con eventId único para solicitar reserva de stock
   */
  async createOrder(data: { productId: number; quantity: number }): Promise<Order> {
    const { productId, quantity } = data;
    
    // 1. Crear el pedido con estado PENDING
    const order = this.orderRepository.create({
      productId,
      quantity,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);
    console.log(`📝 Order ${savedOrder.id} created with status PENDING`);

    // 2. Generar eventId único para idempotencia
    const eventId = uuidv4();

    // 3. Publicar evento para solicitar reserva de stock (CON eventId)
    this.eventsClient.emit('order.stock.requested', {
      eventId,           // ← Campo único para idempotencia
      orderId: savedOrder.id,
      productId: savedOrder.productId,
      quantity: savedOrder.quantity,
    });

    console.log(`📤 Event published: order.stock.requested (EventId: ${eventId}) for Order ${savedOrder.id}`);

    // 4. Publicar webhook externo
    const webhookData: OrderCreatedData = {
      orderId: savedOrder.id,
      productId: savedOrder.productId,
      quantity: savedOrder.quantity,
      status: savedOrder.status,
      createdAt: new Date().toISOString(),
    };

    await this.webhookPublisher.publishWebhook({
      event: WebhookEventType.ORDER_CREATED,
      version: '1.0',
      id: uuidv4(),
      idempotency_key: `order-created-${savedOrder.id}-${eventId}`,
      timestamp: Date.now(),
      data: webhookData,
      metadata: {
        source: 'orders-service',
        environment: 'development',
      },
    });

    return savedOrder;
  }

  /**
   * Actualiza el estado del pedido basado en la respuesta del microservicio de productos
   * NO implementa idempotencia (solo Producto la tiene)
   */
  async updateOrderStatus(payload: {
    orderId: number;
    success: boolean;
    reason?: string;
  }): Promise<void> {
    const { orderId, success, reason } = payload;

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      console.log(`❌ Order ${orderId} not found`);
      return;
    }

    // Actualizar el estado según el resultado de la reserva de stock
    if (success) {
      order.status = OrderStatus.CONFIRMED;
      console.log(`✅ Order ${orderId} status updated to CONFIRMED`);
    } else {
      order.status = OrderStatus.REJECTED;
      order.reason = reason || 'Stock reservation failed';
      console.log(`❌ Order ${orderId} status updated to REJECTED. Reason: ${order.reason}`);
    }

    await this.orderRepository.save(order);
  }

  /**
   * Obtener todos los pedidos
   */
  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find();
  }

  /**
   * Obtener un pedido por ID
   */
  async findOne(id: number): Promise<Order> {
    return await this.orderRepository.findOne({ where: { id } });
  }
}
