# 📘 FLUJO COMPLETO DEL SISTEMA - Guía Técnica Detallada

**Sistema de Microservicios con Idempotencia, Webhooks y Resiliencia**

---

## 📑 TABLA DE CONTENIDOS

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Flujo Completo de un Pedido](#2-flujo-completo-de-un-pedido)
3. [Idempotencia - Prevención de Duplicados](#3-idempotencia---prevención-de-duplicados)
4. [Resiliencia y Manejo de Fallos](#4-resiliencia-y-manejo-de-fallos)
5. [Sistema de Webhooks](#5-sistema-de-webhooks)
6. [Supabase Edge Functions](#6-supabase-edge-functions)
7. [Notificaciones a Telegram](#7-notificaciones-a-telegram)
8. [Validación HMAC-SHA256](#8-validación-hmac-sha256)
9. [Casos de Uso y Escenarios](#9-casos-de-uso-y-escenarios)
10. [Diagramas de Secuencia](#10-diagramas-de-secuencia)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 1.1 Arquitectura de Alto Nivel

El sistema implementa una **arquitectura de microservicios** con comunicación asíncrona mediante **RabbitMQ** y notificaciones externas a través de **webhooks**. Los componentes principales son:

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTE HTTP                             │
└─────────────────────────────┬────────────────────────────────────┘
                              │ POST /orders
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (HTTP)                          │
│                         Puerto 3000                              │
│  - Expone endpoints REST                                         │
│  - Enruta peticiones a microservicios                           │
└─────────────────────────────┬────────────────────────────────────┘
                              │ RabbitMQ: "order.create"
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   ORDERS SERVICE (Microservicio)                 │
│  - Crea pedido con estado PENDING                               │
│  - Genera eventId único (UUID)                                  │
│  - Publica evento: "order.stock.requested"                      │
│  - Publica webhook externo: "order.created"                     │
│  - Base de Datos: orders_db (MySQL - Puerto 3307)              │
└─────────────────────────────┬────────────────────────────────────┘
                              │ RabbitMQ: "order.stock.requested"
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                 PRODUCTS SERVICE (Microservicio)                 │
│  ✅ VERIFICA IDEMPOTENCIA (processed_events)                     │
│  - Valida si eventId ya fue procesado                           │
│  - Si es duplicado: ignora y retorna                            │
│  - Si es nuevo: procesa y registra eventId                      │
│  - Verifica y reduce stock                                      │
│  - Publica evento: "product.stock.reserved"                     │
│  - Publica webhook externo: "product.stock.reserved"            │
│  - Base de Datos: products_db (MySQL - Puerto 3306)            │
└─────────────────────────────┬────────────────────────────────────┘
                              │ RabbitMQ: "product.stock.reserved"
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   ORDERS SERVICE (Microservicio)                 │
│  - Actualiza estado del pedido                                  │
│  - CONFIRMED (si stock OK) o REJECTED (si falla)                │
└──────────────────────────────────────────────────────────────────┘

                              ║ (Webhooks Externos)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS (Serverless)                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  1. webhook-event-logger                               │     │
│  │     - Valida firma HMAC-SHA256                         │     │
│  │     - Verifica idempotencia (processed_webhooks)       │     │
│  │     - Registra evento en webhook_events                │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  2. webhook-external-notifier                          │     │
│  │     - Busca suscriptores activos                       │     │
│  │     - Envía webhooks con reintentos (3 intentos)       │     │
│  │     - Backoff exponencial: 2s, 4s, 8s                  │     │
│  │     - Registra entregas en webhook_deliveries          │     │
│  │     - Envía notificación a Telegram                    │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │   TELEGRAM    │
                      │   (Notifica-  │
                      │    ciones)    │
                      └───────────────┘
```

### 1.2 Tecnologías y Puertos

| Componente | Tecnología | Puerto | Base de Datos |
|------------|------------|--------|---------------|
| **API Gateway** | NestJS (HTTP Server) | 3000 | - |
| **Orders Service** | NestJS (Microservice) | - | MySQL (3307) |
| **Products Service** | NestJS (Microservice) | - | MySQL (3306) |
| **RabbitMQ** | Message Broker | 5672 (AMQP), 15672 (Admin) | - |
| **Supabase** | PostgreSQL + Edge Functions | API personalizada | PostgreSQL |
| **Telegram Bot** | API de Telegram | HTTPS | - |

---

## 2. FLUJO COMPLETO DE UN PEDIDO

### 2.1 Paso a Paso Detallado

#### **PASO 1: Cliente envía petición HTTP**

**Endpoint:** `POST http://localhost:3000/orders`

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 2
}
```

**Código (API Gateway):**
```typescript
// apps/api-gateway/src/orders/orders.controller.ts
@Post()
async createOrder(@Body() createOrderDto: CreateOrderDto) {
  return this.ordersService.createOrder(createOrderDto);
}
```

El API Gateway **NO procesa la lógica de negocio**, solo actúa como punto de entrada HTTP y **enruta la petición** a RabbitMQ.

---

#### **PASO 2: API Gateway envía mensaje a RabbitMQ**

El API Gateway publica un mensaje al patrón `order.create`:

```typescript
// El gateway envía el mensaje via RabbitMQ
this.client.send('order.create', { productId: 1, quantity: 2 })
```

**Importante:** El cliente espera una respuesta del microservicio (patrón request-response de RabbitMQ).

---

#### **PASO 3: Orders Service recibe y procesa el mensaje**

**Código (Orders Service):**
```typescript
// apps/orders-service/src/orders/orders.controller.ts
@MessagePattern('order.create')
async createOrder(data: { productId: number; quantity: number }) {
  return this.ordersService.createOrder(data);
}
```

**Lógica del servicio:**
```typescript
// apps/orders-service/src/orders/orders.service.ts

async createOrder(data: { productId: number; quantity: number }): Promise<Order> {
  // 1. Crear pedido con estado PENDING
  const order = this.orderRepository.create({
    productId: data.productId,
    quantity: data.quantity,
    status: OrderStatus.PENDING,
  });
  
  const savedOrder = await this.orderRepository.save(order);
  console.log(`📝 Order ${savedOrder.id} created with status PENDING`);
  
  // 2. Generar eventId único para idempotencia
  const eventId = uuidv4(); // Ejemplo: "a3f5e8d1-4b2c-4e9a-b7c3-1d2e3f4g5h6i"
  
  // 3. Publicar evento para solicitar reserva de stock
  this.eventsClient.emit('order.stock.requested', {
    eventId,           // ← CLAVE para idempotencia
    orderId: savedOrder.id,
    productId: savedOrder.productId,
    quantity: savedOrder.quantity,
  });
  
  // 4. Publicar webhook externo (orden creada)
  await this.webhookPublisher.publishWebhook({
    event: 'order.created',
    version: '1.0',
    id: uuidv4(),
    idempotency_key: `order-created-${savedOrder.id}-${eventId}`,
    timestamp: Date.now(),
    data: {
      orderId: savedOrder.id,
      productId: savedOrder.productId,
      quantity: savedOrder.quantity,
      status: 'PENDING',
    },
    metadata: {
      source: 'orders-service',
      environment: 'development',
    },
  });
  
  return savedOrder;
}
```

**Estado actual:**
- Pedido creado en `orders_db` con estado `PENDING`
- Evento `order.stock.requested` publicado a RabbitMQ
- Webhook `order.created` enviado a Supabase

---

#### **PASO 4: Products Service recibe solicitud de stock**

**Código (Products Service):**
```typescript
// apps/products-service/src/products/products.controller.ts
@EventPattern('order.stock.requested')
async handleStockRequest(payload: {
  eventId: string;
  orderId: number;
  productId: number;
  quantity: number;
}) {
  await this.productsService.processStockRequest(payload);
}
```

**Lógica con idempotencia:**
```typescript
// apps/products-service/src/products/products.service.ts

async processStockRequest(payload): Promise<void> {
  const { eventId, orderId, productId, quantity } = payload;
  
  console.log(`📦 Received stock request - EventId: ${eventId}`);
  
  // ========================================
  // ✅ PASO 1: VERIFICAR IDEMPOTENCIA
  // ========================================
  const alreadyProcessed = await this.processedEventRepository.findOne({
    where: { eventId },
  });
  
  if (alreadyProcessed) {
    console.log(`⚠️ Event ${eventId} already processed. Skipping duplicate.`);
    return; // ← NO ejecutar lógica de negocio
  }
  
  console.log(`✅ Event ${eventId} is new. Processing...`);
  
  // ========================================
  // PASO 2: VERIFICAR STOCK
  // ========================================
  const product = await this.productRepository.findOne({
    where: { id: productId },
  });
  
  if (!product) {
    // Registrar evento como procesado (aunque haya fallado)
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
  
  if (product.stock < quantity) {
    await this.processedEventRepository.save({
      eventId,
      eventType: 'order.stock.requested',
      payload: { orderId, productId, quantity, result: 'insufficient_stock' },
    });
    
    this.eventsClient.emit('product.stock.reserved', {
      orderId,
      productId,
      quantity,
      success: false,
      reason: `Insufficient stock. Available: ${product.stock}`,
    });
    return;
  }
  
  // ========================================
  // PASO 3: REDUCIR STOCK Y REGISTRAR
  // ========================================
  product.stock -= quantity;
  await this.productRepository.save(product);
  
  // Marcar evento como procesado
  await this.processedEventRepository.save({
    eventId,
    eventType: 'order.stock.requested',
    payload: { orderId, productId, quantity, result: 'success' },
  });
  
  console.log(`✅ Stock reduced. New stock: ${product.stock}`);
  
  // ========================================
  // PASO 4: PUBLICAR EVENTOS
  // ========================================
  
  // Evento interno (RabbitMQ)
  this.eventsClient.emit('product.stock.reserved', {
    orderId,
    productId,
    quantity,
    success: true,
    newStock: product.stock,
  });
  
  // Webhook externo (Supabase)
  await this.webhookPublisher.publishWebhook({
    event: 'product.stock.reserved',
    version: '1.0',
    id: uuidv4(),
    idempotency_key: `stock-reserved-${eventId}`,
    timestamp: Date.now(),
    data: {
      orderId,
      productId,
      quantity,
      success: true,
      newStock: product.stock,
    },
    metadata: {
      source: 'products-service',
      environment: 'development',
    },
  });
}
```

**Estado actual:**
- Stock reducido en `products_db`
- `eventId` registrado en `processed_events` (idempotencia)
- Evento `product.stock.reserved` publicado

---

#### **PASO 5: Orders Service actualiza estado del pedido**

**Código:**
```typescript
// apps/orders-service/src/orders/orders.controller.ts
@EventPattern('product.stock.reserved')
async handleStockReserved(payload: {
  orderId: number;
  success: boolean;
  reason?: string;
}) {
  await this.ordersService.updateOrderStatus(payload);
}
```

```typescript
// apps/orders-service/src/orders/orders.service.ts
async updateOrderStatus(payload): Promise<void> {
  const { orderId, success, reason } = payload;
  
  const order = await this.orderRepository.findOne({
    where: { id: orderId },
  });
  
  if (!order) {
    console.log(`❌ Order ${orderId} not found`);
    return;
  }
  
  if (success) {
    order.status = OrderStatus.CONFIRMED;
    console.log(`✅ Order ${orderId} status updated to CONFIRMED`);
  } else {
    order.status = OrderStatus.REJECTED;
    order.reason = reason || 'Stock reservation failed';
    console.log(`❌ Order ${orderId} status updated to REJECTED: ${order.reason}`);
  }
  
  await this.orderRepository.save(order);
}
```

**Estado final:**
- Pedido actualizado a `CONFIRMED` o `REJECTED` en `orders_db`

---

## 3. IDEMPOTENCIA - PREVENCIÓN DE DUPLICADOS

### 3.1 ¿Qué es la Idempotencia?

**Definición:** La idempotencia garantiza que **ejecutar la misma operación múltiples veces produce el mismo resultado** que ejecutarla una sola vez.

**¿Por qué es importante?**
- **Mensajes duplicados:** RabbitMQ puede entregar el mismo mensaje múltiples veces
- **Reintentos:** Si un servicio falla temporalmente, puede procesar el mismo evento varias veces
- **Consistencia:** Evita reducir el stock dos veces para el mismo pedido

### 3.2 Implementación en Products Service

**Tabla de eventos procesados:**
```sql
-- products_db.processed_events
CREATE TABLE processed_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(36) UNIQUE NOT NULL,  -- ← UUID único
  eventType VARCHAR(100) NOT NULL,
  payload JSON,
  processedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Flujo de idempotencia:**

```typescript
// 1. Verificar si el evento ya fue procesado
const alreadyProcessed = await this.processedEventRepository.findOne({
  where: { eventId: 'a3f5e8d1-4b2c-4e9a-b7c3-1d2e3f4g5h6i' },
});

if (alreadyProcessed) {
  console.log('⚠️ Evento duplicado - IGNORAR');
  return; // ← Salir sin ejecutar lógica de negocio
}

// 2. Ejecutar lógica de negocio (reducir stock)
product.stock -= quantity;
await this.productRepository.save(product);

// 3. Registrar eventId para prevenir futuros duplicados
await this.processedEventRepository.save({
  eventId: 'a3f5e8d1-4b2c-4e9a-b7c3-1d2e3f4g5h6i',
  eventType: 'order.stock.requested',
  payload: { orderId: 123, productId: 1, quantity: 2 },
});
```

### 3.3 Ejemplo de Escenario Duplicado

**Escenario:** RabbitMQ entrega el mismo mensaje dos veces

```
Tiempo  | Evento                           | Estado del Stock | Acción
--------|----------------------------------|------------------|---------------------------
T0      | Stock inicial                    | 10 unidades      |
T1      | Mensaje 1: eventId=ABC (qty: 2)  | 8 unidades       | ✅ Procesado y guardado
T2      | Mensaje 2: eventId=ABC (qty: 2)  | 8 unidades       | ⚠️ Duplicado detectado
        |                                  |                  | ❌ NO se ejecuta lógica
        |                                  |                  | Stock permanece en 8
```

**Sin idempotencia:**
```
T1: Stock = 10 - 2 = 8 ✅
T2: Stock = 8 - 2 = 6  ❌ INCORRECTO (procesó duplicado)
```

**Con idempotencia:**
```
T1: Stock = 10 - 2 = 8 ✅ (eventId ABC guardado)
T2: Stock = 8          ✅ (eventId ABC ya existe → ignorar)
```

---

## 4. RESILIENCIA Y MANEJO DE FALLOS

### 4.1 Reintentos con Backoff Exponencial

Cuando un webhook falla al ser entregado, el sistema implementa **reintentos automáticos** con **backoff exponencial**:

```typescript
// Configuración de reintentos
const MAX_RETRIES = 3;

async function deliverWebhook(url, payload, attempt = 1): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('✅ Webhook entregado exitosamente');
  } catch (error) {
    console.error(`❌ Intento ${attempt} falló: ${error.message}`);
    
    if (attempt < MAX_RETRIES) {
      // Backoff exponencial: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Reintentando en ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      await deliverWebhook(url, payload, attempt + 1);
    } else {
      console.error('❌ Máximo de reintentos alcanzado');
      throw error;
    }
  }
}
```

**Ejemplo de reintentos:**

```
Intento | Delay   | Acción
--------|---------|----------------------------------------
1       | 0s      | Envío inmediato → FALLA (servidor caído)
2       | 2s      | Esperar 2s → Reintentar → FALLA
3       | 4s      | Esperar 4s → Reintentar → FALLA
4       | 8s      | Esperar 8s → Reintentar → ✅ ÉXITO
```

### 4.2 Registro de Entregas

Cada intento de entrega de webhook se registra en la tabla `webhook_deliveries`:

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES webhook_events(id),
  subscription_id UUID REFERENCES webhook_subscriptions(id),
  attempt_number INT,           -- 1, 2, 3
  status TEXT,                  -- 'success', 'failed'
  response_status INT,          -- 200, 404, 500, etc.
  response_body TEXT,
  created_at TIMESTAMP,
  delivered_at TIMESTAMP
);
```

**Ejemplo de registro:**

| attempt_number | status  | response_status | delivered_at         |
|----------------|---------|-----------------|----------------------|
| 1              | failed  | 500             | NULL                 |
| 2              | failed  | 500             | NULL                 |
| 3              | success | 200             | 2025-12-15 14:32:15  |

### 4.3 Garantías de Entrega

El sistema ofrece las siguientes garantías:

1. **At-least-once delivery:** Cada webhook se intenta entregar al menos una vez
2. **Idempotencia:** Los receptores deben manejar duplicados mediante `idempotency_key`
3. **Trazabilidad:** Todos los intentos se registran para auditoría
4. **Circuit breaker:** Si un suscriptor falla persistentemente, se puede desactivar

---

## 5. SISTEMA DE WEBHOOKS

### 5.1 Arquitectura de Webhooks

Los webhooks permiten **notificar eventos de negocio a sistemas externos** en tiempo real.

```
┌─────────────────────┐
│  Microservicio      │
│  (Orders/Products)  │
└──────────┬──────────┘
           │ publishWebhook()
           ▼
┌─────────────────────────────────┐
│  WebhookPublisherService        │
│  - Genera firma HMAC-SHA256     │
│  - Envía a Edge Functions       │
└──────────┬──────────────────────┘
           │ HTTP POST
           ▼
┌─────────────────────────────────┐
│  Supabase Edge Function 1       │
│  webhook-event-logger            │
│  - Valida firma HMAC            │
│  - Verifica idempotencia        │
│  - Registra en webhook_events   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Supabase Edge Function 2       │
│  webhook-external-notifier       │
│  - Busca suscriptores activos   │
│  - Envía webhooks a URLs        │
│  - Implementa reintentos        │
│  - Envía notificación Telegram  │
└──────────┬──────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Suscriptores │
    │ Externos     │
    └──────────────┘
```

### 5.2 Estructura de un Webhook

**Payload estándar:**
```json
{
  "event": "order.created",
  "version": "1.0",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "idempotency_key": "order-created-123-a3f5e8d1",
  "timestamp": 1702651200000,
  "data": {
    "orderId": 123,
    "productId": 1,
    "quantity": 2,
    "status": "PENDING"
  },
  "metadata": {
    "source": "orders-service",
    "environment": "development"
  }
}
```

**Campos importantes:**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `event` | Tipo de evento de negocio | `order.created`, `product.stock.reserved` |
| `id` | UUID único del webhook | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `idempotency_key` | Clave para evitar duplicados | `order-created-123-a3f5e8d1` |
| `timestamp` | Unix timestamp (ms) | `1702651200000` |
| `data` | Datos específicos del evento | `{ orderId: 123, ... }` |

### 5.3 Flujo de Publicación de Webhooks

**Código (WebhookPublisherService):**
```typescript
// apps/shared/webhook-publisher.service.ts

async publishWebhook(payload: WebhookPayload): Promise<void> {
  const payloadString = JSON.stringify(payload);
  
  // 1. Generar firma HMAC-SHA256
  const signature = this.generateSignature(payloadString);
  
  // 2. Enviar a webhook-event-logger (registro y validación)
  const loggerUrl = `${this.supabaseUrl}/functions/v1/webhook-event-logger`;
  const loggerResponse = await fetch(loggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.supabaseServiceRoleKey}`,
      'X-Webhook-Signature': signature,  // ← Firma HMAC
    },
    body: payloadString,
  });
  
  if (!loggerResponse.ok) {
    throw new Error(`Logger failed: ${loggerResponse.status}`);
  }
  
  console.log('✅ Event logged');
  
  // 3. Enviar a webhook-external-notifier (distribución)
  const notifierUrl = `${this.supabaseUrl}/functions/v1/webhook-external-notifier`;
  const notifierResponse = await fetch(notifierUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.supabaseServiceRoleKey}`,
    },
    body: payloadString,
  });
  
  if (!notifierResponse.ok) {
    console.error('Notifier failed');
    return; // No lanzar error (evento ya está registrado)
  }
  
  console.log('📬 Webhook distributed to subscribers');
}
```

---

## 6. SUPABASE EDGE FUNCTIONS

Supabase Edge Functions son **funciones serverless** escritas en **Deno/TypeScript** que se ejecutan en el edge (cerca del usuario). En este sistema, se usan para:

1. **Validar y registrar** webhooks entrantes
2. **Distribuir** webhooks a suscriptores externos
3. **Enviar notificaciones** a Telegram

### 6.1 Edge Function 1: webhook-event-logger

**Propósito:** Validar la autenticidad de los webhooks y registrarlos en la base de datos.

**Ubicación:** `supabase/functions/webhook-event-logger/index.ts`

**Flujo:**

```typescript
Deno.serve(async (req) => {
  // 1. Obtener firma HMAC del header
  const signature = req.headers.get('x-webhook-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { 
      status: 401 
    });
  }
  
  // 2. Leer el payload
  const body = await req.text();
  const payload = JSON.parse(body);
  
  // 3. Validar firma HMAC
  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    console.error('Invalid signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
      status: 401 
    });
  }
  
  console.log('✅ Signature valid');
  
  // 4. Verificar idempotencia
  const { idempotency_key } = payload;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: existing } = await supabase
    .from('processed_webhooks')
    .select('id')
    .eq('idempotency_key', idempotency_key)
    .single();
  
  if (existing) {
    console.log(`Event ${idempotency_key} already processed`);
    return new Response(JSON.stringify({ 
      status: 'already_processed',
      idempotency_key 
    }), { status: 200 });
  }
  
  // 5. Registrar evento
  await supabase.from('webhook_events').insert({
    event_type: payload.event,
    idempotency_key,
    payload
  });
  
  // 6. Marcar como procesado
  await supabase.from('processed_webhooks').insert({
    idempotency_key,
    event_type: payload.event,
    metadata: payload.metadata
  });
  
  console.log('✅ Event logged successfully');
  
  return new Response(JSON.stringify({ 
    status: 'logged',
    idempotency_key 
  }), { status: 200 });
});
```

**Responsabilidades:**
1. ✅ Validar firma HMAC-SHA256 (seguridad)
2. ✅ Verificar idempotencia (evitar duplicados)
3. ✅ Registrar evento en `webhook_events`
4. ✅ Marcar como procesado en `processed_webhooks`

---

### 6.2 Edge Function 2: webhook-external-notifier

**Propósito:** Distribuir webhooks a suscriptores externos y enviar notificaciones a Telegram.

**Ubicación:** `supabase/functions/webhook-external-notifier/index.ts`

**Flujo:**

```typescript
Deno.serve(async (req) => {
  const payload = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Buscar suscriptores activos para este tipo de evento
  const { data: subscriptions } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('event_type', payload.event)
    .eq('is_active', true);
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log('No active subscriptions found');
    return new Response(JSON.stringify({ 
      status: 'no_subscribers',
      total_subscribers: 0 
    }), { status: 200 });
  }
  
  console.log(`📤 Found ${subscriptions.length} subscriber(s)`);
  
  // 2. Obtener event_id del webhook registrado
  const { data: eventRecord } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('idempotency_key', payload.idempotency_key)
    .single();
  
  // 3. Enviar webhook a cada suscriptor
  const deliveryPromises = subscriptions.map(subscription => 
    deliverWebhook(
      subscription.url,
      payload,
      subscription.secret,
      eventRecord.id,
      subscription.id,
      supabase
    )
  );
  
  await Promise.allSettled(deliveryPromises);
  
  // 4. Enviar notificación a Telegram
  await sendTelegramNotification(payload);
  
  return new Response(JSON.stringify({ 
    status: 'distributed',
    total_subscribers: subscriptions.length 
  }), { status: 200 });
});
```

**Responsabilidades:**
1. 📋 Buscar suscriptores activos
2. 📤 Enviar webhooks a URLs externas
3. 🔄 Implementar reintentos con backoff exponencial
4. 📝 Registrar entregas en `webhook_deliveries`
5. 📲 Enviar notificación a Telegram

---

## 7. NOTIFICACIONES A TELEGRAM

### 7.1 ¿Cómo funciona?

El sistema envía **notificaciones en tiempo real** a un canal de Telegram cuando ocurren eventos importantes.

**Configuración:**
```bash
# Variables de entorno (Supabase Edge Function)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

### 7.2 Código de Envío

```typescript
// supabase/functions/webhook-external-notifier/index.ts

async function sendTelegramNotification(payload: any): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram credentials not configured');
    return false;
  }
  
  try {
    // Formatear mensaje con Markdown
    const message = `
🔔 *Webhook Event Received*

📌 *Event:* \`${payload.event}\`
🆔 *ID:* \`${payload.idempotency_key}\`
📅 *Time:* ${new Date(payload.timestamp).toLocaleString()}

📦 *Data:*
\`\`\`json
${JSON.stringify(payload.data, null, 2)}
\`\`\`
    `.trim();
    
    // Enviar mensaje a Telegram API
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
    
    if (response.ok) {
      console.log('✅ Telegram notification sent successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Telegram notification failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Telegram notification error: ${error.message}`);
    return false;
  }
}
```

### 7.3 Ejemplo de Notificación

**Mensaje en Telegram:**

```
🔔 Webhook Event Received

📌 Event: order.created
🆔 ID: order-created-123-a3f5e8d1
📅 Time: 15/12/2025, 14:32:15

📦 Data:
```json
{
  "orderId": 123,
  "productId": 1,
  "quantity": 2,
  "status": "PENDING"
}
```
```

### 7.4 Configuración del Bot de Telegram

**Pasos para configurar:**

1. **Crear un bot:**
   - Hablar con [@BotFather](https://t.me/BotFather) en Telegram
   - Ejecutar `/newbot`
   - Copiar el token: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

2. **Crear un grupo/canal:**
   - Crear un grupo o canal en Telegram
   - Agregar el bot como administrador

3. **Obtener Chat ID:**
   ```bash
   # Enviar un mensaje al grupo y ejecutar:
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   
   # Buscar "chat":{"id":-1001234567890}
   ```

4. **Configurar variables de entorno:**
   ```bash
   # En Supabase Dashboard → Settings → Secrets
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=-1001234567890
   ```

---

## 8. VALIDACIÓN HMAC-SHA256

### 8.1 ¿Qué es HMAC?

**HMAC (Hash-based Message Authentication Code)** es un algoritmo criptográfico que garantiza:
1. ✅ **Autenticidad:** El mensaje proviene del emisor legítimo
2. ✅ **Integridad:** El mensaje no fue modificado en tránsito
3. ✅ **No repudio:** El emisor no puede negar haber enviado el mensaje

### 8.2 Flujo de Validación HMAC

```
┌─────────────────────┐
│  Microservicio      │
│  (Emisor)           │
└──────────┬──────────┘
           │
           │ 1. Serializar payload
           │    payload = '{"event":"order.created",...}'
           │
           │ 2. Generar firma HMAC
           │    signature = HMAC-SHA256(payload, secret)
           │    signature = "a7f3e9d1b2c4..."
           │
           ▼
    HTTP POST Request
    Headers:
      X-Webhook-Signature: a7f3e9d1b2c4...
    Body:
      {"event":"order.created",...}
           │
           ▼
┌─────────────────────────────┐
│  Edge Function              │
│  (Receptor)                 │
└──────────┬──────────────────┘
           │
           │ 3. Leer firma del header
           │    receivedSignature = "a7f3e9d1b2c4..."
           │
           │ 4. Recalcular firma
           │    expectedSignature = HMAC-SHA256(payload, secret)
           │    expectedSignature = "a7f3e9d1b2c4..."
           │
           │ 5. Comparar firmas
           │    if (receivedSignature === expectedSignature) {
           │      ✅ Válido
           │    } else {
           │      ❌ Inválido
           │    }
           ▼
```

### 8.3 Generación de Firma (Emisor)

**Código (WebhookPublisherService):**
```typescript
import { createHmac } from 'crypto';

private readonly webhookSecret = 'your-super-secret-key-change-this-in-production';

private generateSignature(payload: string): string {
  return createHmac('sha256', this.webhookSecret)
    .update(payload)
    .digest('hex');
}

// Uso:
const payloadString = JSON.stringify({
  event: 'order.created',
  id: 'f47ac10b',
  data: { orderId: 123 }
});

const signature = this.generateSignature(payloadString);
// signature = "a7f3e9d1b2c4e5f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1"

// Enviar en header
headers: {
  'X-Webhook-Signature': signature
}
```

### 8.4 Verificación de Firma (Receptor)

**Código (Edge Function):**
```typescript
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  // 1. Importar secret como clave criptográfica
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 2. Calcular firma esperada
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // 3. Comparar firmas (constant-time comparison para evitar timing attacks)
  return expectedSignature === signature;
}

// Uso:
const signature = req.headers.get('x-webhook-signature');
const body = await req.text();

const isValid = await verifySignature(body, signature);
if (!isValid) {
  return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
    status: 401 
  });
}

console.log('✅ Signature valid - Request is authentic');
```

### 8.5 Ejemplo de Validación

**Escenario 1: Firma válida ✅**

```
Emisor calcula:
  payload = '{"event":"order.created","id":"123"}'
  secret = "my-secret-key"
  signature = HMAC-SHA256(payload, secret)
           = "a7f3e9d1b2c4e5f6..."

Receptor verifica:
  receivedPayload = '{"event":"order.created","id":"123"}'
  receivedSignature = "a7f3e9d1b2c4e5f6..."
  
  expectedSignature = HMAC-SHA256(receivedPayload, secret)
                    = "a7f3e9d1b2c4e5f6..."
  
  receivedSignature === expectedSignature
  ✅ VÁLIDO - Autenticado y sin modificaciones
```

**Escenario 2: Payload modificado ❌**

```
Atacante intercepta y modifica:
  originalPayload = '{"event":"order.created","id":"123"}'
  modifiedPayload = '{"event":"order.created","id":"999"}'  ← Cambió ID
  receivedSignature = "a7f3e9d1b2c4e5f6..."  ← Firma original

Receptor verifica:
  expectedSignature = HMAC-SHA256(modifiedPayload, secret)
                    = "f1e0d9c8b7a6..."  ← Firma diferente
  
  receivedSignature !== expectedSignature
  ❌ INVÁLIDO - Payload fue modificado
```

**Escenario 3: Atacante sin secret ❌**

```
Atacante intenta enviar webhook falso:
  fakePayload = '{"event":"order.deleted","id":"all"}'
  fakeSignature = "1234567890abcdef..."  ← Firma inventada

Receptor verifica:
  expectedSignature = HMAC-SHA256(fakePayload, secret)
                    = "c3d2e1f0a9b8..."  ← Firma correcta
  
  fakeSignature !== expectedSignature
  ❌ INVÁLIDO - Atacante no conoce el secret
```

### 8.6 Mejores Prácticas de Seguridad

1. **Secret fuerte:** Usa un secret aleatorio de al menos 32 caracteres
   ```bash
   # Generar secret seguro
   openssl rand -hex 32
   # Output: 7f3a9e2b1c8d4f6a0e5b9c2d8f1a3e6b2c9f5a8d1e4b7c0f3a6e9b2d5f8a1c4
   ```

2. **Rotación de secrets:** Cambia el secret periódicamente
3. **HTTPS obligatorio:** Siempre usa HTTPS para webhooks
4. **Validación estricta:** Rechaza cualquier request con firma inválida
5. **Logging de intentos fallidos:** Registra intentos de autenticación fallidos

---

## 9. CASOS DE USO Y ESCENARIOS

### 9.1 Caso 1: Pedido Exitoso

**Flujo:**
1. Cliente envía `POST /orders` con `productId=1, quantity=2`
2. Orders Service crea pedido con estado `PENDING`
3. Products Service verifica stock (10 unidades disponibles)
4. Products Service reduce stock a 8 unidades
5. Orders Service actualiza pedido a `CONFIRMED`
6. Webhooks enviados:
   - `order.created` → Registrado y distribuido
   - `product.stock.reserved` → Registrado y distribuido
7. Telegram recibe 2 notificaciones

**Resultado:**
- ✅ Pedido confirmado
- ✅ Stock actualizado
- ✅ Eventos registrados
- ✅ Webhooks entregados
- ✅ Notificaciones enviadas

---

### 9.2 Caso 2: Stock Insuficiente

**Flujo:**
1. Cliente envía `POST /orders` con `productId=1, quantity=20`
2. Orders Service crea pedido con estado `PENDING`
3. Products Service verifica stock (solo 8 unidades disponibles)
4. Products Service rechaza: "Insufficient stock. Available: 8"
5. Orders Service actualiza pedido a `REJECTED`

**Resultado:**
- ✅ Pedido rechazado
- ✅ Stock sin cambios
- ✅ Motivo registrado: "Insufficient stock"

---

### 9.3 Caso 3: Evento Duplicado (Idempotencia)

**Flujo:**
1. Cliente envía `POST /orders` con `productId=1, quantity=2`
2. Orders Service crea pedido y publica evento con `eventId=ABC`
3. **RabbitMQ entrega el mensaje dos veces** (problema de red)
4. Products Service recibe primer mensaje:
   - `eventId=ABC` no existe en `processed_events`
   - ✅ Procesa: reduce stock de 10 a 8
   - ✅ Registra `eventId=ABC` en `processed_events`
5. Products Service recibe segundo mensaje (duplicado):
   - `eventId=ABC` ya existe en `processed_events`
   - ⚠️ Detecta duplicado
   - ✅ **IGNORA** (no ejecuta lógica de negocio)
   - ✅ Stock permanece en 8 (correcto)

**Resultado:**
- ✅ Idempotencia garantizada
- ✅ Stock correcto (8 unidades)
- ✅ Sin procesamiento duplicado

---

### 9.4 Caso 4: Webhook con Reintentos

**Flujo:**
1. Orders Service publica webhook `order.created`
2. Edge Function distribuye a suscriptor `https://api.example.com/webhooks`
3. **Intento 1:** Servidor caído → HTTP 503 → FALLA
4. **Espera 2 segundos** (backoff exponencial)
5. **Intento 2:** Timeout → FALLA
6. **Espera 4 segundos**
7. **Intento 3:** Servidor restaurado → HTTP 200 → ✅ ÉXITO

**Resultado:**
- ✅ Webhook entregado exitosamente
- ✅ 3 intentos registrados en `webhook_deliveries`
- ✅ Resiliencia ante fallos temporales

---

## 10. DIAGRAMAS DE SECUENCIA

### 10.1 Diagrama Completo del Flujo

```
Cliente    Gateway    Orders     RabbitMQ    Products    Supabase    Telegram
  │           │          │           │           │           │           │
  │ POST /orders        │           │           │           │           │
  │──────────>│         │           │           │           │           │
  │           │ send(order.create)  │           │           │           │
  │           │──────────>│         │           │           │           │
  │           │         │ emit(msg) │           │           │           │
  │           │         │──────────>│           │           │           │
  │           │         │           │ deliver   │           │           │
  │           │         │           │──────────>│           │           │
  │           │         │           │           │ [Idempotencia]        │
  │           │         │           │           │ Check eventId         │
  │           │         │           │           │ Reduce stock          │
  │           │         │           │           │ Save eventId          │
  │           │         │           │           │           │           │
  │           │         │           │           │ publishWebhook()      │
  │           │         │           │           │──────────>│           │
  │           │         │           │           │           │ Validate HMAC
  │           │         │           │           │           │ Check idempotency
  │           │         │           │           │           │ Register event
  │           │         │           │           │           │           │
  │           │         │           │           │           │ Distribute
  │           │         │           │           │           │──────────>│
  │           │         │           │           │           │           │ sendMessage()
  │           │         │           │ emit(product.stock.reserved)      │
  │           │         │<──────────│           │           │           │
  │           │         │           │           │           │           │
  │           │         │ Update status         │           │           │
  │           │         │ CONFIRMED             │           │           │
  │<──────────│<────────│           │           │           │           │
  │ Response  │         │           │           │           │           │
```

---

## 🎯 CONCLUSIÓN

Este sistema implementa una **arquitectura robusta de microservicios** con las siguientes características clave:

### ✅ Características Principales

1. **Idempotencia:** Previene procesamiento duplicado mediante `eventId` único
2. **Resiliencia:** Reintentos automáticos con backoff exponencial
3. **Webhooks:** Notificaciones en tiempo real a sistemas externos
4. **Seguridad:** Validación HMAC-SHA256 para autenticidad e integridad
5. **Trazabilidad:** Registro completo de eventos y entregas
6. **Escalabilidad:** Comunicación asíncrona mediante RabbitMQ
7. **Observabilidad:** Logs detallados y notificaciones a Telegram

### 📊 Garantías del Sistema

| Garantía | Implementación |
|----------|----------------|
| **At-least-once delivery** | RabbitMQ + reintentos |
| **Exactly-once processing** | Idempotencia con `eventId` |
| **Event sourcing** | Registro en `webhook_events` |
| **Auditabilidad** | Tabla `webhook_deliveries` |
| **Seguridad** | HMAC-SHA256 + HTTPS |

### 🔧 Tecnologías Utilizadas

- **Backend:** NestJS + TypeScript
- **Base de Datos:** MySQL (Orders, Products) + PostgreSQL (Supabase)
- **Message Broker:** RabbitMQ
- **Serverless:** Supabase Edge Functions (Deno)
- **Notificaciones:** Telegram Bot API
- **Seguridad:** HMAC-SHA256

---

**Fecha de creación:** 15 de diciembre de 2025  
**Versión:** 1.0  
**Autor:** Sistema de Microservicios con Idempotencia
