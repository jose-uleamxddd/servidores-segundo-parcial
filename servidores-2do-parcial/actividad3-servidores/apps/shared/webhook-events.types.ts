/**
 * TIPOS DE EVENTOS PARA WEBHOOKS
 * Define los eventos de negocio que se publican externamente
 */

export enum WebhookEventType {
  ORDER_CREATED = 'order.created',
  PRODUCT_STOCK_RESERVED = 'product.stock.reserved',
}

export interface WebhookPayload {
  event: WebhookEventType;
  version: string;
  id: string; // UUID único del webhook
  idempotency_key: string; // Para evitar duplicados
  timestamp: number; // Unix timestamp
  data: any; // Datos del evento
  metadata: {
    source: string; // Nombre del microservicio
    environment: string;
  };
}

export interface OrderCreatedData {
  orderId: number;
  productId: number;
  quantity: number;
  status: string;
  createdAt: string;
}

export interface ProductStockReservedData {
  orderId: number;
  productId: number;
  quantity: number;
  success: boolean;
  newStock?: number;
  reason?: string;
}
