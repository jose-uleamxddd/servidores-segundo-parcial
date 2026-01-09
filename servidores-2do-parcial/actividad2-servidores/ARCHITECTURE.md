# Diagrama de Arquitectura

## Flujo Completo del Sistema

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ HTTP POST /orders
       │ {productId: 1, quantity: 2}
       ▼
┌──────────────────┐
│   API Gateway    │ (Puerto 3000)
│   HTTP Server    │
└──────┬───────────┘
       │ RabbitMQ send("order.create")
       │
       ▼
┌────────────────────────────────┐
│  Microservicio de Pedidos      │
│  ┌──────────────────────────┐  │
│  │ @MessagePattern          │  │
│  │ "order.create"           │  │
│  └──────────┬───────────────┘  │
│             │                  │
│             ▼                  │
│  ┌──────────────────────────┐  │
│  │ 1. Crear pedido          │  │
│  │    status: PENDING       │  │
│  │ 2. Guardar en orders_db  │  │
│  └──────────┬───────────────┘  │
│             │                  │
│             ▼                  │
│  ┌──────────────────────────┐  │
│  │ emit()                   │  │
│  │ "order.stock.requested"  │  │
│  │ {orderId, productId, qty}│  │
│  └──────────────────────────┘  │
└────────────┬───────────────────┘
             │ RabbitMQ
             ▼
┌────────────────────────────────┐
│  Microservicio de Productos    │
│  ┌──────────────────────────┐  │
│  │ @EventPattern            │  │
│  │ "order.stock.requested"  │  │
│  └──────────┬───────────────┘  │
│             │                  │
│             ▼                  │
│  ┌──────────────────────────┐  │
│  │ 1. Buscar producto       │  │
│  │ 2. Verificar stock       │  │
│  │ 3. Reducir stock si OK   │  │
│  │ 4. Guardar en products_db│  │
│  └──────────┬───────────────┘  │
│             │                  │
│             ▼                  │
│  ┌──────────────────────────┐  │
│  │ emit()                   │  │
│  │ "product.stock.reserved" │  │
│  │ {orderId, success, ...}  │  │
│  └──────────────────────────┘  │
└────────────┬───────────────────┘
             │ RabbitMQ
             ▼
┌────────────────────────────────┐
│  Microservicio de Pedidos      │
│  ┌──────────────────────────┐  │
│  │ @EventPattern            │  │
│  │ "product.stock.reserved" │  │
│  └──────────┬───────────────┘  │
│             │                  │
│             ▼                  │
│  ┌──────────────────────────┐  │
│  │ if success:              │  │
│  │   status = CONFIRMED     │  │
│  │ else:                    │  │
│  │   status = REJECTED      │  │
│  │ Guardar en orders_db     │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

## Componentes del Sistema

### 1. API Gateway
- **Tipo**: Servidor HTTP
- **Puerto**: 3000
- **Responsabilidad**: Exponer endpoints REST y enrutar peticiones a microservicios
- **Comunicación**: HTTP (entrada) → RabbitMQ (salida)

### 2. Microservicio de Pedidos
- **Tipo**: Microservicio RabbitMQ
- **Base de Datos**: orders_db (MySQL)
- **Responsabilidades**:
  - Crear pedidos con estado PENDING
  - Solicitar reserva de stock
  - Actualizar estado según respuesta
- **Eventos**:
  - Escucha: `order.create`, `product.stock.reserved`
  - Publica: `order.stock.requested`

### 3. Microservicio de Productos
- **Tipo**: Microservicio RabbitMQ
- **Base de Datos**: products_db (MySQL)
- **Responsabilidades**:
  - Gestionar stock de productos
  - Validar disponibilidad
  - Reservar stock
- **Eventos**:
  - Escucha: `order.stock.requested`
  - Publica: `product.stock.reserved`

## Bases de Datos Independientes

```
┌─────────────────────┐     ┌─────────────────────┐
│   products_db       │     │    orders_db        │
│  (MySQL:3306)       │     │  (MySQL:3307)       │
├─────────────────────┤     ├─────────────────────┤
│ Table: products     │     │ Table: orders       │
│ - id                │     │ - id                │
│ - name              │     │ - productId         │
│ - price             │     │ - quantity          │
│ - stock   ◄─────────┼─────┼─► status            │
│ - createdAt         │     │ - reason            │
│ - updatedAt         │     │ - createdAt         │
└─────────────────────┘     │ - updatedAt         │
                            └─────────────────────┘
```

## Estados del Pedido

```
   PENDING
      │
      │ [Stock disponible]
      ▼
  CONFIRMED
      
      │
      │ [Sin stock / Error]
      ▼
  REJECTED
```
