# 📚 DOCUMENTACIÓN TÉCNICA COMPLETA - Sistema de Microservicios con Idempotencia

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura General](#arquitectura-general)
2. [Flujo Completo de un Pedido](#flujo-completo-de-un-pedido)
3. [Comunicación entre Microservicios](#comunicación-entre-microservicios)
4. [Implementación de Idempotencia](#implementación-de-idempotencia)
5. [Código Detallado por Archivo](#código-detallado-por-archivo)
6. [Base de Datos](#base-de-datos)
7. [Configuración de RabbitMQ](#configuración-de-rabbitmq)

---

## 🏗️ ARQUITECTURA GENERAL

### **Componentes del Sistema:**

```
┌─────────────────┐
│   Cliente HTTP  │
└────────┬────────┘
         │ POST /orders
         ▼
┌─────────────────────────┐
│   API Gateway (3000)    │  ← Puerto HTTP: 3000
│   - Recibe requests     │
│   - Enruta a servicios  │
└────────┬────────────────┘
         │ RabbitMQ (orden.create)
         ▼
┌─────────────────────────┐
│  Orders Service (μS)    │  ← MySQL: orders_db (3307)
│  - Crea pedidos         │
│  - Genera eventId       │
│  - Publica eventos      │
└────────┬────────────────┘
         │ RabbitMQ (order.stock.requested)
         ▼
┌─────────────────────────┐
│ Products Service (μS)   │  ← MySQL: products_db (3306)
│ - Verifica idempotencia │  ← Tabla: processed_events
│ - Reduce stock          │
│ - Registra eventId      │
└────────┬────────────────┘
         │ RabbitMQ (product.stock.reserved)
         ▼
┌─────────────────────────┐
│  Orders Service (μS)    │
│  - Actualiza estado     │
│  - CONFIRMED/REJECTED   │
└─────────────────────────┘
```

### **Tecnologías:**

| Componente | Tecnología | Puerto | Base de Datos |
|------------|------------|--------|---------------|
| API Gateway | NestJS (HTTP) | 3000 | - |
| Orders Service | NestJS (RabbitMQ) | - | MySQL (3307) |
| Products Service | NestJS (RabbitMQ) | - | MySQL (3306) |
| Message Broker | RabbitMQ | 5672, 15672 | - |

---

## 🔄 FLUJO COMPLETO DE UN PEDIDO

### **PASO 1: Cliente crea un pedido**

**Archivo:** `apps/api-gateway/src/orders/orders.controller.ts`

```typescript
// Líneas 10-25
@Post()
async createOrder(@Body() createOrderDto: CreateOrderDto) {
  return this.ordersService.createOrder(createOrderDto);
}
```

**Request HTTP:**
```http
POST http://localhost:3000/orders
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2
}
```

---

### **PASO 2: Gateway publica evento a RabbitMQ**

**Archivo:** `apps/api-gateway/src/orders/orders.service.ts`

```typescript
// Líneas 12-28
async createOrder(createOrderDto: CreateOrderDto) {
  const pattern = { cmd: 'create-order' };
  const payload = createOrderDto;

  // Publica a RabbitMQ y espera respuesta
  return firstValueFrom(
    this.client.send(pattern, payload).pipe(
      timeout(5000),
      catchError(error => {
        throw new Error(`Order service error: ${error.message}`);
      }),
    ),
  );
}
```

**¿Qué hace?**
- Envía comando `create-order` a RabbitMQ
- Espera respuesta del Orders Service (máximo 5 segundos)
- Retorna la respuesta al cliente

---

### **PASO 3: Orders Service recibe el comando**

**Archivo:** `apps/orders-service/src/orders/orders.controller.ts`

```typescript
// Líneas 10-17
@MessagePattern({ cmd: 'create-order' })
async createOrder(@Payload() createOrderDto: any) {
  const order = await this.ordersService.createOrder(
    createOrderDto.productId,
    createOrderDto.quantity,
  );
  return { message: 'Order created successfully', data: order };
}
```

**¿Qué hace?**
- Escucha el patrón `{ cmd: 'create-order' }` en RabbitMQ
- Llama al servicio para crear el pedido
- Retorna confirmación al Gateway

---

### **PASO 4: Orders Service genera eventId único**

**Archivo:** `apps/orders-service/src/orders/orders.service.ts`

```typescript
// Líneas 1-45
import { v4 as uuidv4 } from 'uuid';

async createOrder(productId: number, quantity: number): Promise<Order> {
  // 1. Crear el pedido con estado PENDING
  const order = this.orderRepository.create({
    productId,
    quantity,
    status: OrderStatus.PENDING,
  });

  const savedOrder = await this.orderRepository.save(order);
  console.log(`Pedido ${savedOrder.id} creado con estado PENDING`);

  // 2. Generar eventId único para idempotencia
  const eventId = uuidv4();  // ← CLAVE: Genera UUID único

  // 3. Publicar evento para solicitar reserva de stock (CON eventId)
  this.eventsClient.emit('order.stock.requested', {
    eventId,           // ← Campo único para idempotencia
    orderId: savedOrder.id,
    productId: savedOrder.productId,
    quantity: savedOrder.quantity,
  });

  console.log(`Evento publicado: order.stock.requested (EventId: ${eventId}) para Order ${savedOrder.id}`);

  return savedOrder;
}
```

**¿Qué hace?**
1. Crea el pedido en `orders_db` con estado `PENDING`
2. **GENERA eventId único** usando `uuid.v4()`
3. Publica evento `order.stock.requested` a RabbitMQ **incluyendo el eventId**

**Base de datos después de este paso:**
```sql
-- orders_db.orders
| id | productId | quantity | status  | createdAt           |
|----|-----------|----------|---------|---------------------|
| 1  | 1         | 2        | PENDING | 2025-12-14 19:00:00 |
```

---

### **PASO 5: Products Service recibe el evento**

**Archivo:** `apps/products-service/src/products/products.controller.ts`

```typescript
// Líneas 13-25
@EventPattern('order.stock.requested')
async handleStockRequest(
  @Payload()
  data: {
    eventId: string;     // ← RECIBE el eventId
    orderId: number;
    productId: number;
    quantity: number;
  },
) {
  console.log('Received event: order.stock.requested', data);
  await this.productsService.processStockRequest(data);
}
```

**¿Qué hace?**
- Escucha el evento `order.stock.requested` en RabbitMQ
- Recibe **eventId, orderId, productId, quantity**
- Llama al servicio para procesar la solicitud

---

### **PASO 6: Products Service aplica IDEMPOTENCIA**

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Líneas 28-52 (VERIFICACIÓN DE IDEMPOTENCIA)
async processStockRequest(payload: {
  eventId: string;
  orderId: number;
  productId: number;
  quantity: number;
}): Promise<void> {
  const { eventId, orderId, productId, quantity } = payload;

  console.log(`Received stock request - EventId: ${eventId}, Order: ${orderId}`);

  // ========================================
  // PASO 1: VERIFICAR IDEMPOTENCIA
  // ========================================
  const alreadyProcessed = await this.processedEventRepository.findOne({
    where: { eventId },
  });

  if (alreadyProcessed) {
    console.log(`⚠️ Event ${eventId} already processed at ${alreadyProcessed.processedAt}. Skipping duplicate.`);
    return; // ← RETORNA SIN PROCESAR (IDEMPOTENCIA)
  }

  console.log(`✅ Event ${eventId} is new. Processing...`);
  // ... continúa con lógica de negocio
}
```

**¿Qué hace?**
1. **Busca en la tabla `processed_events`** si el `eventId` ya existe
2. **Si existe:** Retorna inmediatamente (mensaje duplicado)
3. **Si NO existe:** Continúa con el procesamiento

**Consulta SQL ejecutada internamente:**
```sql
SELECT * FROM processed_events WHERE eventId = 'abc-123-def-456';
```

---

### **PASO 7: Products Service reduce stock**

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Líneas 58-110 (LÓGICA DE NEGOCIO)
// Buscar el producto en la base de datos
const product = await this.productRepository.findOne({
  where: { id: productId },
});

if (!product) {
  // Registrar evento como procesado aunque haya fallado
  await this.processedEventRepository.save({
    eventId,
    eventType: 'order.stock.requested',
    payload: { orderId, productId, quantity, result: 'product_not_found' },
  });

  // Publicar evento de rechazo
  this.eventsClient.emit('product.stock.reserved', {
    orderId,
    success: false,
    reason: 'Product not found',
  });
  return;
}

// Verificar si hay stock suficiente
if (product.stock < quantity) {
  // Registrar evento como procesado
  await this.processedEventRepository.save({
    eventId,
    eventType: 'order.stock.requested',
    payload: { orderId, productId, quantity, result: 'insufficient_stock' },
  });

  // Publicar evento de rechazo
  this.eventsClient.emit('product.stock.reserved', {
    orderId,
    success: false,
    reason: 'Insufficient stock',
  });
  return;
}

// ========================================
// PASO 3: REDUCIR STOCK (OPERACIÓN CRÍTICA)
// ========================================
product.stock -= quantity;
await this.productRepository.save(product);

console.log(`✅ Stock reserved successfully for Product ${productId}. New stock: ${product.stock}`);
```

**¿Qué hace?**
1. Busca el producto en `products_db`
2. Verifica si existe
3. Verifica si hay stock suficiente
4. **REDUCE el stock** (operación crítica)
5. Guarda el producto actualizado

**Actualización SQL ejecutada:**
```sql
UPDATE products SET stock = stock - 2 WHERE id = 1;
```

**Base de datos después de este paso:**
```sql
-- products_db.products
| id | name     | stock | price |
|----|----------|-------|-------|
| 1  | Laptop   | 8     | 1200  |  ← Era 10, ahora 8
```

---

### **PASO 8: Products Service registra el eventId**

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Líneas 112-125 (REGISTRO DE IDEMPOTENCIA)
// ========================================
// PASO 4: REGISTRAR EVENTO COMO PROCESADO
// ========================================
await this.processedEventRepository.save({
  eventId,
  eventType: 'order.stock.requested',
  payload: { orderId, productId, quantity, result: 'success' },
});

console.log(`✅ Event ${eventId} registered in processed_events table`);
```

**¿Qué hace?**
- **Guarda el eventId en la tabla `processed_events`**
- Esto garantiza que si el mismo evento llega de nuevo, será detectado en el PASO 6

**Inserción SQL ejecutada:**
```sql
INSERT INTO processed_events (eventId, eventType, payload, processedAt)
VALUES ('abc-123-def-456', 'order.stock.requested', '{"orderId":1,...}', NOW());
```

**Base de datos después de este paso:**
```sql
-- products_db.processed_events
| id | eventId          | eventType             | payload           | processedAt         |
|----|------------------|-----------------------|-------------------|---------------------|
| 1  | abc-123-def-456  | order.stock.requested | {"orderId":1,...} | 2025-12-14 19:00:05 |
```

---

### **PASO 9: Products Service publica respuesta**

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Líneas 127-135 (PUBLICACIÓN DE RESPUESTA)
// ========================================
// PASO 5: PUBLICAR EVENTO DE ÉXITO
// ========================================
this.eventsClient.emit('product.stock.reserved', {
  orderId,
  productId,
  quantity,
  success: true,
});

console.log(`✅ Event 'product.stock.reserved' published for Order ${orderId}`);
```

**¿Qué hace?**
- Publica evento `product.stock.reserved` a RabbitMQ
- Incluye `success: true` para indicar que la reserva fue exitosa

---

### **PASO 10: Orders Service actualiza estado del pedido**

**Archivo:** `apps/orders-service/src/orders/orders.controller.ts`

```typescript
// Líneas 19-26
@EventPattern('product.stock.reserved')
async handleStockReserved(
  @Payload() data: { orderId: number; success: boolean; reason?: string },
) {
  console.log('Received event: product.stock.reserved', data);
  await this.ordersService.updateOrderStatus(data);
}
```

**Archivo:** `apps/orders-service/src/orders/orders.service.ts`

```typescript
// Líneas 47-75
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
```

**¿Qué hace?**
1. Escucha el evento `product.stock.reserved`
2. Busca el pedido en `orders_db`
3. Actualiza el estado a `CONFIRMED` (si success=true) o `REJECTED` (si success=false)
4. Guarda el pedido actualizado

**Actualización SQL ejecutada:**
```sql
UPDATE orders SET status = 'CONFIRMED' WHERE id = 1;
```

**Base de datos después de este paso:**
```sql
-- orders_db.orders
| id | productId | quantity | status    | createdAt           | updatedAt           |
|----|-----------|----------|-----------|---------------------|---------------------|
| 1  | 1         | 2        | CONFIRMED | 2025-12-14 19:00:00 | 2025-12-14 19:00:06 |
```

---

## 📡 COMUNICACIÓN ENTRE MICROSERVICIOS

### **Tipo 1: Request-Response (Gateway → Orders)**

**Archivo:** `apps/api-gateway/src/app.module.ts` (Configuración del cliente)

```typescript
// Líneas 15-28
ClientsModule.register([
  {
    name: 'ORDERS_SERVICE',
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
    },
  },
]),
```

**Uso:**
```typescript
this.client.send({ cmd: 'create-order' }, payload)
```

- **Patrón:** Request-Response (espera respuesta)
- **Cola:** `orders_queue`
- **Timeout:** 5 segundos

---

### **Tipo 2: Event-Based (Orders → Products → Orders)**

**Archivo:** `apps/orders-service/src/app.module.ts` (Configuración del cliente)

```typescript
// Líneas 23-35
ClientsModule.register([
  {
    name: 'EVENTS_SERVICE',
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'events_queue',
      queueOptions: {
        durable: true,
      },
    },
  },
]),
```

**Uso:**
```typescript
this.eventsClient.emit('order.stock.requested', { eventId, orderId, ... })
```

- **Patrón:** Fire-and-Forget (no espera respuesta)
- **Cola:** `events_queue`
- **Eventos:** `order.stock.requested`, `product.stock.reserved`

---

### **Configuración de RabbitMQ en main.ts**

**Archivo:** `apps/products-service/src/main.ts`

```typescript
// Líneas 6-18
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'events_queue',
      queueOptions: {
        durable: true,
      },
    },
  },
);
```

**¿Qué hace?**
- Conecta el microservicio a RabbitMQ
- Escucha la cola `events_queue`
- Credenciales: `admin:admin`
- Puerto: `5672`

---

## 🔐 IMPLEMENTACIÓN DE IDEMPOTENCIA

### **Entidad ProcessedEvent**

**Archivo:** `apps/products-service/src/products/entities/processed-event.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })  // ← Constraint UNIQUE
  eventId: string;

  @Column({ length: 50 })
  eventType: string;

  @Column({ type: 'json', nullable: true })
  payload: any;

  @CreateDateColumn()
  processedAt: Date;
}
```

**Características:**
- `eventId` tiene **constraint UNIQUE** → No permite duplicados
- `eventType` registra qué tipo de evento fue (`order.stock.requested`)
- `payload` guarda JSON con detalles del evento
- `processedAt` registra cuándo se procesó

---

### **Registro en AppModule**

**Archivo:** `apps/products-service/src/app.module.ts`

```typescript
// Líneas 4-5
import { Product } from './products/entities/product.entity';
import { ProcessedEvent } from './products/entities/processed-event.entity';

// Líneas 18-19
entities: [Product, ProcessedEvent],  // ← Registra ambas entidades

// Línea 22
TypeOrmModule.forFeature([Product, ProcessedEvent]),  // ← Disponible para inyección
```

---

### **Inyección en ProductsService**

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Líneas 9-16
constructor(
  @InjectRepository(Product)
  private productRepository: Repository<Product>,
  
  @InjectRepository(ProcessedEvent)  // ← Inyecta repositorio
  private processedEventRepository: Repository<ProcessedEvent>,
  
  @Inject('EVENTS_SERVICE') 
  private eventsClient: ClientProxy,
) {}
```

---

### **Algoritmo de Idempotencia**

```
┌─────────────────────────────────────────┐
│ Evento llega: order.stock.requested     │
│ eventId: "abc-123-def-456"              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ PASO 1: Buscar eventId en tabla        │
│ SELECT * FROM processed_events          │
│ WHERE eventId = 'abc-123-def-456'       │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ¿Existe?          ¿No existe?
        │                 │
        ▼                 ▼
┌────────────────┐  ┌────────────────────┐
│ YA PROCESADO   │  │ EVENTO NUEVO       │
│                │  │                    │
│ console.log(   │  │ Reducir stock      │
│  "⚠️ Already   │  │ product.stock -= 2 │
│  processed")   │  │                    │
│                │  │ Guardar producto   │
│ RETURN         │  │ SAVE product       │
│ (sin procesar) │  │                    │
└────────────────┘  │ Registrar eventId  │
                    │ INSERT INTO        │
                    │ processed_events   │
                    │                    │
                    │ Publicar respuesta │
                    │ emit(...reserved)  │
                    └────────────────────┘
```

---

### **Código Completo de Idempotencia**

**Archivo:** `apps/products-service/src/products/products.service.ts` (Líneas 28-135)

```typescript
async processStockRequest(payload: {
  eventId: string;
  orderId: number;
  productId: number;
  quantity: number;
}): Promise<void> {
  const { eventId, orderId, productId, quantity } = payload;

  // ========================================
  // PASO 1: VERIFICAR IDEMPOTENCIA
  // ========================================
  const alreadyProcessed = await this.processedEventRepository.findOne({
    where: { eventId },
  });

  if (alreadyProcessed) {
    console.log(`⚠️ Event ${eventId} already processed. Skipping.`);
    return;
  }

  // ========================================
  // PASO 2: EJECUTAR LÓGICA DE NEGOCIO
  // ========================================
  const product = await this.productRepository.findOne({ where: { id: productId } });

  if (!product || product.stock < quantity) {
    // Registrar fallo también
    await this.processedEventRepository.save({
      eventId,
      eventType: 'order.stock.requested',
      payload: { orderId, result: 'failed' },
    });
    // Publicar rechazo
    this.eventsClient.emit('product.stock.reserved', { orderId, success: false });
    return;
  }

  // ========================================
  // PASO 3: REDUCIR STOCK
  // ========================================
  product.stock -= quantity;
  await this.productRepository.save(product);

  // ========================================
  // PASO 4: REGISTRAR EVENTID
  // ========================================
  await this.processedEventRepository.save({
    eventId,
    eventType: 'order.stock.requested',
    payload: { orderId, productId, quantity, result: 'success' },
  });

  // ========================================
  // PASO 5: PUBLICAR RESPUESTA
  // ========================================
  this.eventsClient.emit('product.stock.reserved', {
    orderId,
    success: true,
  });
}
```

---

## 💾 BASE DE DATOS

### **products_db (Puerto 3306)**

**Tabla: products**

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Datos iniciales:**
```sql
INSERT INTO products (name, price, stock) VALUES
('Laptop', 1200.00, 10),
('Mouse', 25.50, 50),
('Keyboard', 75.00, 30);
```

**Archivo:** `apps/products-service/src/products/entities/product.entity.ts`

---

**Tabla: processed_events**

```sql
CREATE TABLE processed_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(100) UNIQUE NOT NULL,  -- Constraint UNIQUE
  eventType VARCHAR(50) NOT NULL,
  payload JSON,
  processedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Archivo:** `apps/products-service/src/products/entities/processed-event.entity.ts`

---

### **orders_db (Puerto 3307)**

**Tabla: orders**

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'REJECTED') DEFAULT 'PENDING',
  reason VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Archivo:** `apps/orders-service/src/orders/entities/order.entity.ts`

```typescript
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column()
  quantity: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 🐰 CONFIGURACIÓN DE RABBITMQ

### **docker-compose.yml**

```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: rabbitmq
  ports:
    - "5672:5672"   # Puerto AMQP
    - "15672:15672" # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: admin
```

**URLs:**
- AMQP: `amqp://admin:admin@localhost:5672`
- Management UI: `http://localhost:15672` (admin/admin)

---

### **Colas utilizadas:**

| Cola | Usado por | Patrón | Eventos |
|------|-----------|--------|---------|
| `orders_queue` | Gateway ↔ Orders | Request-Response | `{ cmd: 'create-order' }` |
| `events_queue` | Orders ↔ Products | Event-Based | `order.stock.requested`, `product.stock.reserved` |

---

## 📊 RESUMEN DE ARCHIVOS CLAVE

### **API Gateway**

| Archivo | Líneas Importantes | Función |
|---------|-------------------|---------|
| `apps/api-gateway/src/orders/orders.controller.ts` | 10-25 | Recibe POST /orders |
| `apps/api-gateway/src/orders/orders.service.ts` | 12-28 | Envía comando a RabbitMQ |
| `apps/api-gateway/src/app.module.ts` | 15-28 | Configura cliente RabbitMQ |

### **Orders Service**

| Archivo | Líneas Importantes | Función |
|---------|-------------------|---------|
| `apps/orders-service/src/orders/orders.controller.ts` | 10-26 | Escucha comandos y eventos |
| `apps/orders-service/src/orders/orders.service.ts` | 1-6, 19-45 | Genera eventId y crea pedido |
| `apps/orders-service/src/orders/orders.service.ts` | 47-75 | Actualiza estado del pedido |
| `apps/orders-service/src/orders/entities/order.entity.ts` | Todas | Define estructura Order |

### **Products Service (IDEMPOTENCIA)**

| Archivo | Líneas Importantes | Función |
|---------|-------------------|---------|
| `apps/products-service/src/products/products.controller.ts` | 13-25 | Escucha order.stock.requested |
| `apps/products-service/src/products/products.service.ts` | 28-52 | **Verifica idempotencia** |
| `apps/products-service/src/products/products.service.ts` | 58-110 | **Lógica de negocio** |
| `apps/products-service/src/products/products.service.ts` | 112-125 | **Registra eventId** |
| `apps/products-service/src/products/products.service.ts` | 127-135 | **Publica respuesta** |
| `apps/products-service/src/products/entities/processed-event.entity.ts` | Todas | **Tabla de idempotencia** |

---

## 🧪 EJEMPLO DE EJECUCIÓN COMPLETA

### **Consola 1: API Gateway**
```
[Nest] Application is running on: http://localhost:3000
```

### **Consola 2: Orders Service**
```
[Nest] Microservice is listening
📝 Order 1 created with status PENDING
📤 Event published: order.stock.requested (EventId: abc-123-...) for Order 1
🎧 Received event: product.stock.reserved
✅ Order 1 status updated to CONFIRMED
```

### **Consola 3: Products Service**
```
[Nest] Microservice is listening
🎧 Received event: order.stock.requested
📦 Received stock request - EventId: abc-123-..., Order: 1, Product: 1, Quantity: 2
✅ Event abc-123-... is new. Processing...
✅ Stock reserved successfully for Product 1. New stock: 8
✅ Event abc-123-... registered in processed_events table
✅ Event 'product.stock.reserved' published for Order 1
```

### **Si el evento llega DUPLICADO:**
```
📦 Received stock request - EventId: abc-123-..., Order: 1
⚠️ Event abc-123-... already processed at 2025-12-14 19:00:05. Skipping duplicate.
```

---

## ✅ CONCLUSIÓN

**Idempotencia garantizada mediante:**

1. **Generación de eventId único** (UUID v4) en Orders Service
2. **Tabla processed_events** con constraint UNIQUE en Products Service
3. **Verificación antes de procesar** cada evento
4. **Registro después de procesar** para detectar duplicados futuros

**Resultado:** Aunque RabbitMQ reenvíe un mensaje 10 veces, el stock solo se reduce UNA vez.
