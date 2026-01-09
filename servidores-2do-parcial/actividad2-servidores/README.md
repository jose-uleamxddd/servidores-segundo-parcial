# Sistema de Microservicios con NestJS, RabbitMQ y MySQL

Sistema académico de microservicios que implementa una arquitectura híbrida (HTTP + RabbitMQ) con comunicación asíncrona entre servicios.

## 🏗️ Arquitectura

- **API Gateway** (Puerto 3000): Expone endpoints HTTP y enruta peticiones a los microservicios vía RabbitMQ
- **Microservicio de Productos**: Gestiona el stock de productos (solo RabbitMQ)
- **Microservicio de Pedidos**: Gestiona los pedidos (solo RabbitMQ)
- **RabbitMQ**: Broker de mensajería para comunicación entre microservicios
- **MySQL**: Bases de datos independientes para cada microservicio

## 📋 Prerequisitos

- Node.js v18+
- Docker y Docker Compose
- npm o yarn

## 🚀 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar infraestructura (RabbitMQ y MySQL):
```bash
docker-compose up -d
```

3. Esperar a que los contenedores estén listos (30 segundos aprox)

## ▶️ Ejecutar el Sistema

Opción 1 - Iniciar todos los servicios simultáneamente:
```bash
npm run start:all
```

Opción 2 - Iniciar servicios por separado:
```bash
# Terminal 1
npm run start:gateway

# Terminal 2
npm run start:products

# Terminal 3
npm run start:orders
```

## 🔄 Flujo de Negocio

1. Cliente envía petición HTTP POST al API Gateway
2. API Gateway enruta la petición al Microservicio de Pedidos vía RabbitMQ
3. Microservicio de Pedidos:
   - Crea el pedido con estado `PENDING`
   - Publica evento `order.stock.requested`
4. Microservicio de Productos:
   - Escucha evento `order.stock.requested`
   - Verifica y reduce el stock
   - Publica evento `product.stock.reserved`
5. Microservicio de Pedidos:
   - Escucha evento `product.stock.reserved`
   - Actualiza el estado del pedido a `CONFIRMED` o `REJECTED`

## 🧪 Probar el Sistema

### 1. Crear un producto (acceso directo a BD):

Conectarse a MySQL de productos:
```bash
docker exec -it mysql-products mysql -uroot -proot products_db
```

Insertar producto de prueba:
```sql
INSERT INTO products (name, price, stock, createdAt, updatedAt) 
VALUES ('Laptop', 999.99, 10, NOW(), NOW());
```

### 2. Crear un pedido:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d "{\"productId\": 1, \"quantity\": 2}"
```

### 3. Verificar el pedido:

Conectarse a MySQL de pedidos:
```bash
docker exec -it mysql-orders mysql -uroot -proot orders_db
```

Consultar pedidos:
```sql
SELECT * FROM orders;
```

### 4. Verificar el stock actualizado:

```bash
docker exec -it mysql-products mysql -uroot -proot products_db -e "SELECT * FROM products;"
```

## 📊 Monitoreo

- **RabbitMQ Management UI**: http://localhost:15672 (admin/admin)
- Ver colas, mensajes y conexiones

## 🛠️ Estructura del Proyecto

```
apps/
├── api-gateway/          # Gateway HTTP
│   └── src/
│       ├── main.ts       # Bootstrap HTTP
│       ├── app.module.ts
│       └── orders/
│           └── orders.controller.ts
│
├── products-service/     # Microservicio de Productos
│   └── src/
│       ├── main.ts       # Bootstrap RabbitMQ
│       ├── app.module.ts
│       └── products/
│           ├── entities/product.entity.ts
│           ├── products.controller.ts  # @EventPattern
│           └── products.service.ts
│
└── orders-service/       # Microservicio de Pedidos
    └── src/
        ├── main.ts       # Bootstrap RabbitMQ
        ├── app.module.ts
        └── orders/
            ├── entities/order.entity.ts
            ├── orders.controller.ts  # @MessagePattern + @EventPattern
            └── orders.service.ts
```

## 📝 Eventos RabbitMQ

| Evento | Publicado por | Escuchado por | Payload |
|--------|---------------|---------------|---------|
| `order.create` | API Gateway | Orders Service | `{productId, quantity}` |
| `order.stock.requested` | Orders Service | Products Service | `{orderId, productId, quantity}` |
| `product.stock.reserved` | Products Service | Orders Service | `{orderId, success, reason?}` |

## 🗄️ Bases de Datos

### products_db
- `products`: id, name, price, stock, createdAt, updatedAt

### orders_db
- `orders`: id, productId, quantity, status, reason, createdAt, updatedAt

## 🔧 Configuración

### Conexiones RabbitMQ:
- URL: `amqp://localhost:5672`
- Colas:
  - `orders_queue`
  - `products_queue`
  - `events_queue`

### Conexiones MySQL:
- Products: `localhost:3306`
- Orders: `localhost:3307`
- Usuario: `root`
- Contraseña: `root`

## 🧹 Limpiar el Entorno

```bash
# Detener servicios
docker-compose down

# Eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v
```

## 📚 Tecnologías Utilizadas

- NestJS
- @nestjs/microservices (RabbitMQ Transport)
- TypeORM
- MySQL
- RabbitMQ
- Docker

## ⚠️ Notas Importantes

- Este sistema NO implementa idempotencia (preparado para agregar más adelante)
- NO usa sagas manuales ni circuit breakers
- La comunicación entre microservicios es 100% RabbitMQ
- Solo el API Gateway expone endpoints HTTP

## 🎯 Próximos Pasos (Opcional)

- Implementar idempotencia con tokens únicos
- Agregar compensación en caso de fallas
- Implementar DTOs compartidos
- Agregar validaciones más robustas
- Implementar logging centralizado
