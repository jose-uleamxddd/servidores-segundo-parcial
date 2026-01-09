# 🚀 GUÍA DE EJECUCIÓN DEL SISTEMA

## ✅ Estado Actual

- ✅ Docker containers corriendo (RabbitMQ + MySQL)
- ✅ Microservicio de Productos funcionando
- ✅ Microservicio de Pedidos funcionando
- ✅ Productos creados en la base de datos
- ⚠️ API Gateway necesita iniciarse manualmente

## 📝 PASOS PARA EJECUTAR EL SISTEMA COMPLETO

### 1. Verificar que Docker esté corriendo

```powershell
docker ps
```

Deberías ver 3 contenedores:
- `rabbitmq`
- `mysql-products`
- `mysql-orders`

### 2. Abrir 3 Terminales PowerShell

#### Terminal 1 - Microservicio de Productos
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:products
```

Espera hasta ver: `🔧 Products Microservice is listening on RabbitMQ`

#### Terminal 2 - Microservicio de Pedidos
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:orders
```

Espera hasta ver: `📝 Orders Microservice is listening on RabbitMQ`

#### Terminal 3 - API Gateway
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:gateway
```

Espera hasta ver: `🚀 API Gateway running on http://localhost:3000`

### 3. Crear un Producto (si no existe)

```powershell
docker exec mysql-products mysql -uroot -proot products_db -e "INSERT INTO products (name, price, stock) VALUES ('Laptop Gaming', 1599.99, 20);"
```

### 4. Crear un Pedido

Abre una CUARTA terminal y ejecuta:

```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
.\test-order.ps1
```

O manualmente:

```powershell
$body = @{productId = 1; quantity = 2} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/orders" -Method POST -Body $body -ContentType "application/json"
```

### 5. Verificar el Flujo Completo

#### Ver los logs en cada terminal:

**Terminal 1 (Products)**  
Deberías ver:
```
🎧 Received event: order.stock.requested
📦 Processing stock request for Order X, Product 1, Quantity 2
✅ Stock reserved for Product 1. New stock: 8
```

**Terminal 2 (Orders)**  
Deberías ver:
```
🎧 Received message: order.create
📝 Order X created with status PENDING
📤 Event published: order.stock.requested for Order X
🎧 Received event: product.stock.reserved
✅ Order X status updated to CONFIRMED
```

**Terminal 3 (Gateway)**  
Deberías ver la petición HTTP entrante.

### 6. Verificar en la Base de Datos

#### Ver productos y stock actualizado:
```powershell
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT * FROM products;"
```

#### Ver pedidos creados:
```powershell
docker exec mysql-orders mysql -uroot -proot orders_db -e "SELECT * FROM orders;"
```

## 🔍 VERIFICACIONES

### Ver RabbitMQ Management UI
Abre en el navegador: http://localhost:15672  
Usuario: `admin`  
Contraseña: `admin`

Verás las colas:
- `orders_queue`
- `products_queue`
- `events_queue`

## 🛑 DETENER TODO

```powershell
# Detener los servicios Node (Ctrl+C en cada terminal)

# Detener Docker
docker-compose down
```

## 📊 EJEMPLO DE FLUJO EXITOSO

```
Cliente → POST /orders {productId: 1, quantity: 2}
   ↓
API Gateway recibe HTTP
   ↓
Gateway → Orders Service (RabbitMQ: order.create)
   ↓
Orders Service crea pedido PENDING
   ↓
Orders → Products (RabbitMQ: order.stock.requested)
   ↓
Products verifica stock: 10 unidades
Products reduce stock: 10 - 2 = 8
   ↓
Products → Orders (RabbitMQ: product.stock.reserved {success: true})
   ↓
Orders actualiza pedido a CONFIRMED
   ↓
Gateway responde al cliente con el pedido creado
```

## ❗ SOLUCIÓN DE PROBLEMAS

### Si el API Gateway no inicia:
1. Verifica que no haya otro proceso en el puerto 3000
2. Reinicia la terminal
3. Asegúrate de que RabbitMQ esté corriendo

### Si no hay comunicación entre servicios:
1. Verifica que RabbitMQ esté corriendo: `docker ps`
2. Verifica las credenciales en RabbitMQ Management UI
3. Revisa que todos los servicios usen `amqp://admin:admin@localhost:5672`

### Si hay errores de base de datos:
1. Verifica que las bases de datos existan:
   ```powershell
   docker exec mysql-products mysql -uroot -proot -e "SHOW DATABASES;"
   docker exec mysql-orders mysql -uroot -proot -e "SHOW DATABASES;"
   ```

## 🎯 ARQUITECTURA IMPLEMENTADA

✅ **API Gateway** - Solo HTTP (puerto 3000)  
✅ **Orders Service** - Solo RabbitMQ  
✅ **Products Service** - Solo RabbitMQ  
✅ **Comunicación inter-servicios** - 100% RabbitMQ  
✅ **Bases de datos independientes**  
✅ **Eventos asíncronos**  
✅ **Sin HTTP entre microservicios**
