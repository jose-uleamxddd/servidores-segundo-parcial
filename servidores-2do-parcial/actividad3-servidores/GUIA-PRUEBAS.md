# 🧪 GUÍA DE PRUEBAS - Sistema de Microservicios

## 📋 **PREPARACIÓN**

### 1. Asegurarse que Docker esté corriendo
```powershell
docker-compose up -d
```

**Verificar contenedores:**
```powershell
docker ps
```

Deberías ver:
- `rabbitmq` (puertos 5672, 15672)
- `mysql-products` (puerto 3306)
- `mysql-orders` (puerto 3307)

---

### 2. Iniciar los microservicios

**Terminal 1 - Products Service:**
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:products
```

**Terminal 2 - Orders Service:**
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:orders
```

**Terminal 3 - API Gateway:**
```powershell
cd "c:\Users\cesar arteaga\Desktop\actividad2-servidores"
npm run start:gateway
```

Espera a ver estos mensajes:
```
✅ Connected to RabbitMQ
✅ Microservice is listening
✅ Application is running on: http://localhost:3000
```

---

## 🧪 **PRUEBA 1: Funcionamiento Normal**

### Objetivo: Verificar que el flujo básico funciona correctamente

```powershell
.\test-order.ps1
```

**Qué hace:**
1. Crea un pedido de 2 unidades del producto 1
2. Orders Service genera un `eventId` único
3. Publica evento `order.stock.requested` con el eventId
4. Products Service:
   - Verifica que el eventId NO existe en `processed_events`
   - Reduce el stock
   - Registra el eventId en la tabla
   - Publica `product.stock.reserved`
5. Orders Service actualiza el estado a `CONFIRMED`

**Resultado esperado:**
```
✅ Pedido creado exitosamente
   - Order ID: 1
   - Estado: CONFIRMED
   - Stock reducido en 2 unidades
```

**Verificación en consola de Products Service:**
```
📦 Received stock request - EventId: abc-123-..., Order: 1, Product: 1, Quantity: 2
✅ Event abc-123-... is new. Processing...
✅ Stock reserved successfully for Product 1. New stock: 8
```

---

## 🧪 **PRUEBA 2: Idempotencia Individual**

### Objetivo: Ver cómo un evento se procesa solo una vez

```powershell
.\test-idempotencia.ps1
```

**Qué hace:**
1. Crea UN pedido (genera UN eventId)
2. Muestra el estado del pedido
3. Proporciona comandos para verificar la base de datos

**Resultado esperado:**
- ✅ 1 registro en `processed_events`
- ✅ Stock reducido UNA sola vez
- ✅ Pedido en estado `CONFIRMED`

**Consola de Products Service:**
```
📦 Received stock request - EventId: def-456-...
✅ Event def-456-... is new. Processing...
✅ Stock reserved successfully
```

Si RabbitMQ reenviara el mismo mensaje (cosa que normalmente no pasa con un POST único), verías:
```
📦 Received stock request - EventId: def-456-...
⚠️ Event def-456-... already processed at 2025-12-14 19:30:00. Skipping duplicate.
```

---

## 🧪 **PRUEBA 3: Múltiples Pedidos**

### Objetivo: Verificar que cada pedido tiene su propio eventId

```powershell
.\test-multiples-pedidos.ps1
```

**Qué hace:**
1. Consulta el stock inicial
2. Crea 3 pedidos consecutivos
3. Cada pedido genera su propio `eventId` único
4. Verifica que el stock se redujo correctamente
5. Muestra todos los eventId procesados

**Resultado esperado:**
```
📦 STOCK:
   - Stock inicial: 10
   - Stock final: 7
   - Reducción: 3 unidades ✅

📋 EVENTOS PROCESADOS:
   - eventId: abc-123-... → Order: 3
   - eventId: def-456-... → Order: 2
   - eventId: ghi-789-... → Order: 1

📝 ESTADOS:
   Order 1: CONFIRMED ✅
   Order 2: CONFIRMED ✅
   Order 3: CONFIRMED ✅
```

**Validación:**
- ✅ 3 registros únicos en `processed_events`
- ✅ 3 eventId diferentes (no duplicados)
- ✅ Stock reducido exactamente 3 veces

---

## 🔍 **VERIFICACIÓN EN BASE DE DATOS**

### Ver eventos procesados:
```powershell
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT * FROM processed_events ORDER BY processedAt DESC;"
```

**Ejemplo de salida:**
```
+----+--------------------------------------+-----------------------+---------------------------+---------------------+
| id | eventId                              | eventType             | payload                   | processedAt         |
+----+--------------------------------------+-----------------------+---------------------------+---------------------+
| 3  | 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d | order.stock.requested | {"orderId":3,"result":... | 2025-12-14 19:35:20 |
| 2  | 7c9e6679-7425-40de-944b-e07fc1f90ae7 | order.stock.requested | {"orderId":2,"result":... | 2025-12-14 19:35:19 |
| 1  | 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed | order.stock.requested | {"orderId":1,"result":... | 2025-12-14 19:35:18 |
+----+--------------------------------------+-----------------------+---------------------------+---------------------+
```

**Puntos clave:**
- Cada `eventId` es único (UUID v4)
- Cada registro tiene un timestamp de cuándo se procesó
- El payload contiene información del resultado

---

### Ver stock de productos:
```powershell
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT id, name, price, stock FROM products;"
```

---

### Ver pedidos:
```powershell
docker exec mysql-orders mysql -uroot -proot orders_db -e "SELECT id, productId, quantity, status, reason, createdAt FROM orders ORDER BY id DESC;"
```

---

## 🎯 **PRUEBA AVANZADA: Simular Fallo y Reintento**

### Escenario: ¿Qué pasa si el servicio falla DESPUÉS de procesar pero ANTES de registrar?

**Opción 1: Detener Products Service durante procesamiento**
1. Crear un pedido
2. Inmediatamente detener Products Service (Ctrl+C)
3. Reiniciar Products Service
4. RabbitMQ reenviará el mensaje
5. Verificar que el mensaje se procesa

**Opción 2: Ver logs en tiempo real**
```powershell
# En la consola de Products Service, buscar:
✅ Event {eventId} is new. Processing...  # Primera vez
⚠️ Event {eventId} already processed      # Si llega duplicado
```

---

## 📊 **CASOS DE USO DE IDEMPOTENCIA**

| Escenario | eventId | Procesamiento | Stock |
|-----------|---------|---------------|-------|
| Pedido nuevo | `abc-123` (nuevo) | ✅ Procesa | 10 → 8 |
| Reintento de RabbitMQ | `abc-123` (duplicado) | ⚠️ Ignora | 8 (sin cambios) |
| Nuevo pedido | `def-456` (nuevo) | ✅ Procesa | 8 → 6 |
| Fallo y reenvío | `def-456` (duplicado) | ⚠️ Ignora | 6 (sin cambios) |

---

## ✅ **CHECKLIST DE VALIDACIÓN**

Marca cada punto después de probarlo:

**Funcionamiento básico:**
- [ ] Pedido se crea con estado `PENDING`
- [ ] Evento `order.stock.requested` se publica con `eventId`
- [ ] Products Service recibe y procesa el evento
- [ ] Stock se reduce correctamente
- [ ] eventId se registra en `processed_events`
- [ ] Pedido cambia a `CONFIRMED`

**Idempotencia:**
- [ ] Cada pedido genera un `eventId` único (UUID)
- [ ] eventId tiene constraint UNIQUE en la tabla
- [ ] Si un mensaje llega 2 veces, solo se procesa 1 vez
- [ ] El stock NO se reduce dos veces con el mismo eventId
- [ ] Los logs muestran "⚠️ already processed" para duplicados

**Base de datos:**
- [ ] Tabla `processed_events` existe en `products_db`
- [ ] Cada eventId aparece UNA sola vez en la tabla
- [ ] El payload JSON contiene información del pedido
- [ ] El timestamp `processedAt` refleja cuándo se procesó

---

## 🚨 **TROUBLESHOOTING**

### Problema: "Connection refused" en RabbitMQ
**Solución:**
```powershell
docker-compose restart rabbitmq
```

### Problema: "ECONNREFUSED 3306" en MySQL
**Solución:**
```powershell
docker-compose restart mysql-products mysql-orders
```

### Problema: Pedido queda en PENDING
**Verificar:**
1. Products Service está corriendo
2. No hay errores en la consola de Products
3. El producto existe y tiene stock suficiente

### Problema: Error "Duplicate entry for key 'eventId'"
**Esto es CORRECTO** - significa que la idempotencia está funcionando.
El servicio está intentando insertar el mismo eventId dos veces, lo cual está bloqueado por el constraint UNIQUE.

---

## 📝 **RESUMEN**

| Script | Propósito | Qué verifica |
|--------|-----------|--------------|
| `test-order.ps1` | Crear 1 pedido | Flujo completo funciona |
| `test-idempotencia.ps1` | Explicar idempotencia | Cómo funciona el mecanismo |
| `test-multiples-pedidos.ps1` | Crear 3 pedidos | Cada uno tiene eventId único |

**Todos los scripts incluyen comandos para verificar en la base de datos.**
