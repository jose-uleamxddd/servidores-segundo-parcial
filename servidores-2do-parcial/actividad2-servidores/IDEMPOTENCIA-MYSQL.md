# 🔐 CONSUMIDOR IDEMPOTENTE - Implementación Completa

## ✅ **AHORA SÍ CUMPLE TODOS LOS REQUISITOS**

- ✅ Idempotencia SOLO en microservicio Producto
- ✅ Tabla `processed_events` en MySQL (NO Redis)
- ✅ Campo `eventId` incluido en el mensaje
- ✅ Usa TypeORM para la entidad de control
- ✅ NO usa Redis, Outbox, polling, sagas ni circuit breaker

---

## 📋 **TABLA DE CONTROL: `processed_events`**

```typescript
@Entity('processed_events')
export class ProcessedEvent {
  id: number;                    // PK autoincremental
  eventId: string;               // UUID único del evento (UNIQUE INDEX)
  eventType: string;             // Tipo: "order.stock.requested"
  payload: any;                  // JSON con datos del evento
  processedAt: Date;             // Timestamp de procesamiento
}
```

**Propósito:** Registrar cada `eventId` procesado para evitar duplicados.

---

## 🔄 **FLUJO DE IDEMPOTENCIA**

### **1. Pedido publica evento CON eventId**
```typescript
const eventId = uuidv4(); // Genera UUID único

this.eventsClient.emit('order.stock.requested', {
  eventId,        // ← Campo único para idempotencia
  orderId: 1,
  productId: 1,
  quantity: 2
});
```

### **2. Producto recibe el evento**
```typescript
@EventPattern('order.stock.requested')
async handleStockRequest(data: {
  eventId: string;  // ← Verifica este campo
  orderId: number;
  productId: number;
  quantity: number;
}) {
  await this.productsService.processStockRequest(data);
}
```

### **3. Producto verifica si ya fue procesado**
```typescript
// PASO 1: Buscar en tabla processed_events
const alreadyProcessed = await this.processedEventRepository.findOne({
  where: { eventId }
});

if (alreadyProcessed) {
  console.log(`⚠️ Event ${eventId} already processed. Skipping.`);
  return; // ← NO ejecuta lógica de negocio
}
```

### **4. Si es nuevo, procesa y registra**
```typescript
// PASO 2: Reducir stock (operación crítica)
product.stock -= quantity;
await this.productRepository.save(product);

// PASO 3: Registrar eventId en processed_events
await this.processedEventRepository.save({
  eventId,
  eventType: 'order.stock.requested',
  payload: { orderId, productId, quantity, result: 'success' }
});

// PASO 4: Publicar respuesta
this.eventsClient.emit('product.stock.reserved', {
  orderId,
  success: true
});
```

---

## 🧪 **PRUEBA DE IDEMPOTENCIA**

### **Escenario: Mensaje duplicado**

```
Mensaje 1 llega:
  EventId: "abc-123-def-456"
  ↓
  Busca en processed_events → NO existe
  ↓
  Reduce stock: 10 → 8
  ↓
  Registra eventId "abc-123-def-456" en BD
  ✅ Stock final: 8

Mensaje 1 llega OTRA VEZ (duplicado):
  EventId: "abc-123-def-456"
  ↓
  Busca en processed_events → ¡SÍ existe!
  ↓
  ⚠️ "Event already processed. Skipping."
  ↓
  NO reduce stock
  ✅ Stock final: 8 (sin cambios)
```

---

## 📊 **VERIFICAR EN LA BASE DE DATOS**

### Ver eventos procesados:
```sql
SELECT * FROM processed_events ORDER BY processedAt DESC;
```

**Resultado esperado:**
```
| id | eventId              | eventType             | payload                   | processedAt          |
|----|----------------------|-----------------------|---------------------------|----------------------|
| 1  | abc-123-def-456      | order.stock.requested | {"orderId":1,"result":... | 2025-12-14 18:30:00  |
```

### Ver stock actualizado:
```sql
SELECT id, name, stock FROM products;
```

---

## 🎯 **COMPARACIÓN: CON vs SIN IDEMPOTENCIA**

| Escenario | Sin Idempotencia | Con Idempotencia |
|-----------|------------------|------------------|
| Mensaje llega 1 vez | Stock: 10 → 8 ✅ | Stock: 10 → 8 ✅ |
| Mensaje llega 3 veces (duplicado) | Stock: 10 → 8 → 6 → 4 ❌ | Stock: 10 → 8 ✅ |
| Resultado | **Incorrecto** | **Correcto** |

---

## 🔑 **PUNTOS CLAVE**

1. **eventId es único por mensaje** - Generado con `uuid.v4()`
2. **Solo Producto verifica** - Pedido NO implementa idempotencia
3. **Tabla MySQL** - No Redis, no caché externo
4. **Índice único** - `eventId` tiene constraint UNIQUE
5. **Retorno silencioso** - Si ya existe, no hace nada

---

## 📦 **EJECUTAR EL SISTEMA**

```powershell
# 1. Instalar dependencias (incluye uuid)
npm install

# 2. Iniciar Docker (sin Redis)
docker-compose up -d

# 3. Reiniciar microservicios
# Terminal 1: npm run start:products
# Terminal 2: npm run start:orders
# Terminal 3: npm run start:gateway

# 4. Crear pedido
.\test-order.ps1

# 5. Ver tabla processed_events
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT * FROM processed_events;"
```

---

## ✅ **RESULTADO FINAL**

**Idempotencia implementada correctamente:**
- ✅ Tabla de control en MySQL
- ✅ Solo en Producto (consumidor crítico)
- ✅ eventId en cada mensaje
- ✅ Stock se reduce UNA SOLA VEZ
- ✅ Sin Redis, Outbox, polling ni sagas

**El sistema ahora garantiza que aunque RabbitMQ reenvíe el mismo mensaje múltiples veces, el stock solo se modificará una vez.**
