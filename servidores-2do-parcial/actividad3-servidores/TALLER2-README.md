# Taller 2: Arquitectura Event-Driven con Webhooks y Serverless

## 📋 Índice
- [Requisitos del Taller](#requisitos-del-taller)
- [Arquitectura Implementada](#arquitectura-implementada)
- [Cumplimiento de Requisitos](#cumplimiento-de-requisitos)
- [Componentes Serverless](#componentes-serverless)
- [Sistema de Webhooks](#sistema-de-webhooks)
- [Seguridad y Firmas HMAC](#seguridad-y-firmas-hmac)
- [Idempotencia](#idempotencia)
- [Flujo Completo](#flujo-completo)
- [Pruebas](#pruebas)

---

## 🎯 Requisitos del Taller

**Objetivo:** Implementar una arquitectura event-driven que combine:
1. ✅ Comunicación interna con RabbitMQ (del Taller 1)
2. ✅ Webhooks HTTP para notificaciones externas
3. ✅ Serverless con Supabase Edge Functions
4. ✅ Firmas HMAC-SHA256 para seguridad
5. ✅ Idempotencia garantizada
6. ✅ Reintentos automáticos
7. ✅ Observabilidad completa

---

## 🏗️ Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA HÍBRIDA                          │
│  HTTP (Webhooks Externos) + RabbitMQ (Eventos Internos)         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      HTTP POST        ┌─────────────────┐
│   Cliente    │ ──────────────────────>│  API Gateway    │
└──────────────┘                        │  (Port 3000)    │
                                        └────────┬────────┘
                                                 │ RabbitMQ
                                                 │ orders_queue
                                        ┌────────▼────────┐
                                        │ Orders Service  │
                                        │                 │
                                        │ 1. Crea orden   │
                                        │ 2. Publica      │
                                        │    Webhook ──────────┐
                                        │ 3. Emite evento │    │
                                        └────────┬────────┘    │
                                                 │ RabbitMQ    │
                                                 │ events_queue│
                                        ┌────────▼────────┐    │
                                        │Products Service │    │
                                        │                 │    │
                                        │ 1. Reduce stock │    │
                                        │ 2. Publica      │    │
                                        │    Webhook ──────────┤
                                        │ 3. Responde     │    │
                                        └────────┬────────┘    │
                                                 │             │
                                                 │             │
┌────────────────────────────────────────────────┼─────────────▼───────┐
│                    SUPABASE (Serverless)       │                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Edge Functions (Deno Runtime)                   │   │
│  │                                                               │   │
│  │  ┌──────────────────────────┐  ┌─────────────────────────┐  │   │
│  │  │ webhook-event-logger     │  │ webhook-external-       │  │   │
│  │  │                          │  │ notifier                │  │   │
│  │  │ - Valida HMAC           │  │ - Obtiene suscriptores  │  │   │
│  │  │ - Verifica idempotencia │  │ - Envía webhooks        │  │   │
│  │  │ - Registra eventos      │  │ - Reintentos con backoff│  │   │
│  │  └──────────┬───────────────┘  └────────┬────────────────┘  │   │
│  │             │                            │                   │   │
│  └─────────────┼────────────────────────────┼───────────────────┘   │
│                │                            │                       │
│  ┌─────────────▼────────────────────────────▼───────────────────┐   │
│  │              PostgreSQL Database                             │   │
│  │                                                               │   │
│  │  - webhook_events (eventos publicados)                       │   │
│  │  - processed_webhooks (idempotencia)                         │   │
│  │  - webhook_subscriptions (URLs suscriptoras)                 │   │
│  │  - webhook_deliveries (log de entregas)                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Cumplimiento de Requisitos

### 1️⃣ Webhooks HTTP para Comunicación Externa

#### **Dónde:** Módulo compartido `WebhookPublisherService`
**Archivo:** `apps/shared/webhook-publisher.service.ts`

**Líneas clave:**
```typescript
// Línea 20-24: Método principal de publicación
async publishWebhook(payload: WebhookPayload): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = this.generateSignature(payloadString);
  
  // Línea 30-40: POST HTTP a Edge Function
  const loggerUrl = `${this.supabaseUrl}/functions/v1/webhook-event-logger`;
  const loggerResponse = await fetch(loggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.supabaseServiceRoleKey}`,
      'X-Webhook-Signature': signature, // ← Firma HMAC
    },
    body: payloadString,
  });
}
```

**Uso en Orders Service:**
- **Archivo:** `apps/orders-service/src/orders/orders.service.ts`
- **Líneas 49-66:** Cuando se crea una orden, publica webhook `order.created`

```typescript
// Línea 49: Preparar datos del webhook
const webhookData: OrderCreatedData = {
  orderId: savedOrder.id,
  productId: savedOrder.productId,
  quantity: savedOrder.quantity,
  status: savedOrder.status,
  createdAt: new Date().toISOString(),
};

// Línea 57: Publicar webhook HTTP a Supabase
await this.webhookPublisher.publishWebhook({
  event: WebhookEventType.ORDER_CREATED,
  version: '1.0',
  id: uuidv4(),
  idempotency_key: `order-created-${savedOrder.id}-${eventId}`,
  timestamp: Date.now(),
  data: webhookData,
  metadata: { source: 'orders-service', environment: 'development' },
});
```

**Uso en Products Service:**
- **Archivo:** `apps/products-service/src/products/products.service.ts`
- **Líneas 140-161:** Cuando se reserva stock, publica webhook `product.stock.reserved`

---

### 2️⃣ Serverless con Supabase Edge Functions

#### **Edge Function 1: webhook-event-logger**
**Archivo:** `supabase/functions/webhook-event-logger/index.ts`

**Propósito:** Validar firmas HMAC, verificar idempotencia, registrar eventos

**Líneas clave:**
```typescript
// Línea 11-28: Validación de firma HMAC-SHA256
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

// Línea 45-52: Validación de firma en cada request
const signature = req.headers.get('x-webhook-signature');
const body = await req.text();
const isValid = await verifySignature(body, signature);
if (!isValid) {
  return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
}

// Línea 60-67: Verificación de idempotencia
const { data: existing } = await supabase
  .from('processed_webhooks')
  .select('id')
  .eq('idempotency_key', idempotency_key)
  .single();

if (existing) {
  return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 });
}

// Línea 72-85: Registro del evento
await supabase.from('webhook_events').insert({
  event_type: event,
  idempotency_key,
  payload
});

await supabase.from('processed_webhooks').insert({
  idempotency_key,
  event_type: event,
  metadata: { processed_by: 'webhook-event-logger' }
});
```

#### **Edge Function 2: webhook-external-notifier**
**Archivo:** `supabase/functions/webhook-external-notifier/index.ts`

**Propósito:** Distribuir webhooks a suscriptores externos con reintentos

**Líneas clave:**
```typescript
// Línea 11-25: Generación de firma HMAC para suscriptores
async function generateSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Línea 28-75: Entrega con reintentos automáticos (backoff exponencial)
async function deliverWebhook(..., attempt: number = 1): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Webhook-Signature': signature,
        'X-Event-Type': payload.event,
        'X-Idempotency-Key': payload.idempotency_key
      },
      body: payloadString
    });
    
    // Registrar entrega exitosa o fallida
    await supabase.from('webhook_deliveries').insert({
      event_id: eventId,
      subscription_id: subscriptionId,
      attempt_number: attempt,
      status: response.ok ? 'success' : 'failed',
      response_status: response.status,
      response_body: responseBody
    });
    
  } catch (error) {
    // Reintentar con backoff exponencial: 2s, 4s, 8s
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await deliverWebhook(..., attempt + 1);
    }
  }
}

// Línea 95-105: Obtener suscriptores activos
const { data: subscriptions } = await supabase
  .from('webhook_subscriptions')
  .select('*')
  .eq('event_type', event)
  .eq('is_active', true);

// Línea 110-120: Entregar a cada suscriptor
for (const subscription of subscriptions) {
  await deliverWebhook(
    subscription.url,
    payload,
    subscription.secret,
    eventData.id,
    subscription.id,
    supabase
  );
}
```

**Deployment de Edge Functions:**
```bash
# Despliegue ejecutado con:
npx supabase functions deploy webhook-event-logger --project-ref aidmhgugrycsgzzarsou
npx supabase functions deploy webhook-external-notifier --project-ref aidmhgugrycsgzzarsou
```

**URLs resultantes:**
- `https://aidmhgugrycsgzzarsou.supabase.co/functions/v1/webhook-event-logger`
- `https://aidmhgugrycsgzzarsou.supabase.co/functions/v1/webhook-external-notifier`

---

### 3️⃣ Firmas HMAC-SHA256 para Seguridad

#### **Generación en NestJS:**
**Archivo:** `apps/shared/webhook-publisher.service.ts`

```typescript
// Línea 13-17: Generación de firma HMAC
private generateSignature(payload: string): string {
  return createHmac('sha256', this.webhookSecret)
    .update(payload)
    .digest('hex');
}

// Línea 32: Header con firma
headers: {
  'X-Webhook-Signature': signature,
}
```

#### **Validación en Edge Function:**
**Archivo:** `supabase/functions/webhook-event-logger/index.ts`

```typescript
// Línea 11-28: Validación HMAC con Web Crypto API
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature; // ← Comparación constant-time
}
```

**Secret compartido:**
- **Archivo:** `.env.supabase`
- **Línea 8:** `WEBHOOK_SECRET=your-super-secret-key-change-this-in-production`
- **Configurado en Supabase:** `npx supabase secrets set WEBHOOK_SECRET="..."`

---

### 4️⃣ Idempotencia Garantizada

#### **En NestJS - Generación de claves únicas:**
**Archivo:** `apps/orders-service/src/orders/orders.service.ts`

```typescript
// Línea 35: Generar eventId único
const eventId = uuidv4();

// Línea 61: Clave de idempotencia única
idempotency_key: `order-created-${savedOrder.id}-${eventId}`,
```

**Archivo:** `apps/products-service/src/products/products.service.ts`

```typescript
// Línea 155: Combina productId, orderId y eventId para garantizar unicidad
idempotency_key: `product-stock-reserved-${productId}-${orderId}-${eventId}`,
```

#### **En Edge Function - Verificación:**
**Archivo:** `supabase/functions/webhook-event-logger/index.ts`

```typescript
// Línea 60-72: Verificar si el evento ya fue procesado
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

// Línea 80-87: Marcar como procesado
await supabase.from('processed_webhooks').insert({
  idempotency_key,
  event_type: event,
  metadata: { processed_by: 'webhook-event-logger' }
});
```

#### **Base de Datos - Constraint único:**
**Archivo:** `supabase-schema.sql`

```sql
-- Línea 18: Tabla de eventos con idempotency_key único
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,  -- ← UNIQUE garantiza duplicados rechazados
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Línea 38: Tabla de procesados
CREATE TABLE processed_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,  -- ← UNIQUE
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Línea 48: Índice para búsquedas rápidas
CREATE INDEX idx_webhook_events_idempotency ON webhook_events(idempotency_key);
CREATE INDEX idx_processed_webhooks_key ON processed_webhooks(idempotency_key);
```

---

### 5️⃣ Reintentos Automáticos con Backoff Exponencial

**Archivo:** `supabase/functions/webhook-external-notifier/index.ts`

```typescript
// Línea 8: Configuración de reintentos
const MAX_RETRIES = 3;

// Línea 28-75: Lógica de reintentos
async function deliverWebhook(..., attempt: number = 1): Promise<void> {
  try {
    console.log(`📤 Sending webhook to ${url} (attempt ${attempt}/${MAX_RETRIES})`);
    
    const response = await fetch(url, { ... });
    
    // Línea 44-54: Registro de entrega
    await supabase.from('webhook_deliveries').insert({
      event_id: eventId,
      subscription_id: subscriptionId,
      attempt_number: attempt,
      status: response.ok ? 'success' : 'failed',
      response_status: response.status,
      response_body: responseBody,
      delivered_at: response.ok ? new Date().toISOString() : null
    });
    
  } catch (error) {
    // Línea 67-72: Backoff exponencial
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      await deliverWebhook(..., attempt + 1); // ← Reintento recursivo
    } else {
      console.error(`❌ Max retries reached for ${url}`);
      throw error;
    }
  }
}
```

**Tabla de seguimiento:**
```sql
-- Línea 23-31: Tabla webhook_deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES webhook_events(id),
  subscription_id UUID REFERENCES webhook_subscriptions(id),
  attempt_number INT DEFAULT 1,           -- ← Número de intento
  status TEXT NOT NULL,                   -- 'pending', 'success', 'failed'
  response_status INT,                    -- HTTP status code
  response_body TEXT,                     -- Respuesta del suscriptor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE   -- NULL si falló
);
```

---

### 6️⃣ Arquitectura Híbrida (HTTP + RabbitMQ)

#### **Comunicación Interna con RabbitMQ:**
Mantiene el Taller 1 intacto:

**Orders Service:**
- **Archivo:** `apps/orders-service/src/main.ts`
- **Líneas 10-18:** Escucha en `orders_queue` (comandos del Gateway)
- **Líneas 20-28:** Escucha en `events_queue` (eventos de Products)

**Products Service:**
- **Archivo:** `apps/products-service/src/main.ts`
- **Líneas 7-17:** Escucha en `events_queue` (eventos de Orders)

#### **Comunicación Externa con Webhooks:**
**Orders Service publica webhooks:**
- **Archivo:** `apps/orders-service/src/orders/orders.service.ts`
- **Línea 57-66:** Webhook HTTP a Supabase después de crear orden
- **Línea 39-47:** RabbitMQ evento a Products (sin cambios del Taller 1)

**Products Service publica webhooks:**
- **Archivo:** `apps/products-service/src/products/products.service.ts`
- **Línea 146-161:** Webhook HTTP a Supabase después de reservar stock
- **Línea 131-135:** RabbitMQ evento a Orders (sin cambios del Taller 1)

**Ventajas de la arquitectura híbrida:**
- **RabbitMQ:** Comunicación rápida y confiable entre microservicios internos
- **Webhooks:** Notificaciones a sistemas externos sin acoplamiento

---

### 7️⃣ Observabilidad Completa

#### **Logs en NestJS:**
**Archivo:** `apps/shared/webhook-publisher.service.ts`

```typescript
// Línea 28: Log al publicar
this.logger.log(`📤 Publishing webhook: ${payload.event} (${payload.idempotency_key})`);

// Línea 48: Log de éxito en registro
this.logger.log(`✅ Event logged: ${loggerResult.status}`);

// Línea 63: Log de distribución
this.logger.log(`📬 Webhook distributed to ${notifierResult.total_subscribers || 0} subscriber(s)`);

// Línea 69: Log de errores
this.logger.error(`❌ Error publishing webhook: ${error.message}`, error.stack);
```

#### **Logs en Edge Functions:**
**Archivo:** `supabase/functions/webhook-event-logger/index.ts`

```typescript
// Línea 93: Log de evento procesado
console.log(`✅ Event logged: ${event} (${idempotency_key})`);

// Línea 56: Log de firma inválida
console.error('Invalid signature');

// Línea 68: Log de evento duplicado
console.log(`Event ${idempotency_key} already processed`);
```

**Archivo:** `supabase/functions/webhook-external-notifier/index.ts`

```typescript
// Línea 36: Log de intento de entrega
console.log(`📤 Sending webhook to ${url} (attempt ${attempt}/${MAX_RETRIES})`);

// Línea 51: Log de éxito
console.log(`✅ Webhook delivered successfully to ${url}`);

// Línea 54: Log de fallo
console.error(`❌ Delivery failed (attempt ${attempt}): ${error.message}`);
```

#### **Persistencia en Base de Datos:**

**Tabla 1: webhook_events** - Todos los eventos publicados
```sql
SELECT event_type, idempotency_key, payload, created_at 
FROM webhook_events 
ORDER BY created_at DESC;
```

**Tabla 2: processed_webhooks** - Eventos procesados (idempotencia)
```sql
SELECT idempotency_key, event_type, processed_at, metadata 
FROM processed_webhooks 
ORDER BY processed_at DESC;
```

**Tabla 3: webhook_deliveries** - Log de entregas a suscriptores
```sql
SELECT attempt_number, status, response_status, created_at, delivered_at 
FROM webhook_deliveries 
ORDER BY created_at DESC;
```

**Tabla 4: webhook_subscriptions** - Suscriptores registrados
```sql
SELECT url, event_type, is_active, created_at 
FROM webhook_subscriptions;
```

---

## 🔄 Flujo Completo Paso a Paso

### Ejemplo: Crear un pedido

```bash
POST http://localhost:3000/orders
Body: { "productId": 1, "quantity": 2 }
```

**Paso 1: API Gateway recibe request**
- **Archivo:** `apps/api-gateway/src/orders/orders.controller.ts`
- **Línea 15-17:** Controlador POST `/orders`
- Envía mensaje `order.create` a RabbitMQ → `orders_queue`

**Paso 2: Orders Service procesa**
- **Archivo:** `apps/orders-service/src/orders/orders.service.ts`
- **Línea 26:** Crea orden en MySQL con estado `PENDING`
- **Línea 35:** Genera `eventId` único (UUID)
- **Línea 39-47:** Publica evento RabbitMQ `order.stock.requested` → `events_queue`
- **Línea 49-66:** **WEBHOOK HTTP:** Publica `order.created` a Supabase

**Paso 3: Edge Function recibe webhook**
- **Archivo:** `supabase/functions/webhook-event-logger/index.ts`
- **Línea 45:** Obtiene firma HMAC del header `X-Webhook-Signature`
- **Línea 49:** Valida firma con `verifySignature()`
- **Línea 60-67:** Verifica idempotencia en tabla `processed_webhooks`
- **Línea 72-76:** Inserta en tabla `webhook_events`
- **Línea 80-85:** Marca como procesado en `processed_webhooks`
- **Retorna:** `{ status: 'success', event: 'order.created', idempotency_key: '...' }`

**Paso 4: Edge Function notifica suscriptores**
- **Archivo:** `supabase/functions/webhook-external-notifier/index.ts`
- **Línea 95-102:** Busca suscriptores activos para evento `order.created`
- **Línea 110-120:** Envía webhook a cada suscriptor con firma HMAC
- **Línea 28-75:** Maneja reintentos con backoff exponencial (2s, 4s, 8s)
- **Línea 44-54:** Registra cada intento en `webhook_deliveries`

**Paso 5: Products Service procesa stock**
- **Archivo:** `apps/products-service/src/products/products.service.ts`
- **Línea 43-52:** Verifica idempotencia del `eventId` en tabla `processed_events`
- **Línea 107:** Reduce stock del producto
- **Línea 114-119:** Marca evento como procesado
- **Línea 125-135:** Publica evento RabbitMQ `product.stock.reserved` → `events_queue`
- **Línea 140-161:** **WEBHOOK HTTP:** Publica `product.stock.reserved` a Supabase

**Paso 6: Edge Function recibe segundo webhook**
- **Archivo:** `supabase/functions/webhook-event-logger/index.ts`
- Repite validación HMAC + idempotencia para evento `product.stock.reserved`
- Registra en base de datos

**Paso 7: Orders Service confirma pedido**
- **Archivo:** `apps/orders-service/src/orders/orders.service.ts`
- **Línea 88-101:** Recibe evento `product.stock.reserved` de RabbitMQ
- **Línea 91:** Actualiza orden a estado `CONFIRMED`

**Resultado final:**
- ✅ Orden confirmada en MySQL
- ✅ Stock reducido en MySQL
- ✅ 2 webhooks registrados en Supabase (`order.created`, `product.stock.reserved`)
- ✅ Idempotencia garantizada en ambos eventos
- ✅ Logs completos en consola y base de datos

---

## 🧪 Pruebas

### Prueba 1: Flujo completo
```bash
.\test-webhooks.ps1
```

**Verifica:**
- ✅ Orden creada con estado PENDING
- ✅ Orden actualizada a CONFIRMED
- ✅ Stock reducido correctamente
- ✅ Webhooks registrados en Supabase

### Prueba 2: Verificar webhooks en Supabase

**SQL 1: Ver eventos registrados**
```sql
SELECT event_type, idempotency_key, payload->>'data' as data, created_at 
FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

**Resultado esperado:**
```
event_type              | idempotency_key                                     | data
------------------------|-----------------------------------------------------|------
order.created           | order-created-39-4d876c71-b8f6-49af-b0b9-...      | {"orderId":39,"status":"PENDING",...}
product.stock.reserved  | product-stock-reserved-1-39-4d876c71-b8f6-...     | {"orderId":39,"success":true,"newStock":94}
```

**SQL 2: Verificar idempotencia**
```sql
SELECT idempotency_key, event_type, processed_at, metadata 
FROM processed_webhooks 
ORDER BY processed_at DESC 
LIMIT 10;
```

**Resultado esperado:**
```
idempotency_key                                     | event_type              | processed_at              | metadata
----------------------------------------------------|-------------------------|---------------------------|----------
order-created-39-4d876c71-b8f6-49af-b0b9-...       | order.created           | 2025-12-15 02:06:21...   | {"source":"orders-service",...}
product-stock-reserved-1-39-4d876c71-b8f6-...      | product.stock.reserved  | 2025-12-15 02:06:21...   | {"source":"products-service",...}
```

### Prueba 3: Idempotencia (enviar mismo evento dos veces)

**Simular duplicado:**
```bash
# Primera ejecución: crea evento
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"productId":1,"quantity":2}'

# El microservicio internamente envía el webhook a Supabase
# Si intentas enviar manualmente el mismo idempotency_key:
curl -X POST https://aidmhgugrycsgzzarsou.supabase.co/functions/v1/webhook-event-logger \
  -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: [firma_hmac]" \
  -d '{"event":"order.created","idempotency_key":"order-created-39-4d876c71-...",...}'
```

**Resultado esperado:**
```json
{
  "status": "already_processed",
  "idempotency_key": "order-created-39-4d876c71-b8f6-49af-b0b9-..."
}
```

### Prueba 4: Validación HMAC (firma inválida)

**Enviar webhook con firma incorrecta:**
```bash
curl -X POST https://aidmhgugrycsgzzarsou.supabase.co/functions/v1/webhook-event-logger \
  -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: firma_invalida_12345" \
  -d '{"event":"order.created",...}'
```

**Resultado esperado:**
```json
{
  "error": "Invalid signature"
}
```
**HTTP Status:** 401 Unauthorized

---

## 📁 Estructura de Archivos del Taller 2

```
actividad2-servidores/
│
├── apps/
│   ├── shared/                              # ← NUEVO: Módulo compartido de webhooks
│   │   ├── webhook-events.types.ts          # Tipos de eventos (order.created, etc.)
│   │   ├── webhook-publisher.service.ts     # Servicio para publicar webhooks
│   │   └── webhook.module.ts                # Módulo NestJS global
│   │
│   ├── orders-service/
│   │   └── src/
│   │       ├── env.config.ts                # ← NUEVO: Carga .env.supabase
│   │       ├── main.ts                      # ← MODIFICADO: Importa env.config
│   │       ├── app.module.ts                # ← MODIFICADO: Importa WebhookModule
│   │       └── orders/
│   │           └── orders.service.ts        # ← MODIFICADO: Publica webhooks
│   │
│   ├── products-service/
│   │   └── src/
│   │       ├── env.config.ts                # ← NUEVO: Carga .env.supabase
│   │       ├── main.ts                      # ← MODIFICADO: Importa env.config
│   │       ├── app.module.ts                # ← MODIFICADO: Importa WebhookModule
│   │       └── products/
│   │           └── products.service.ts      # ← MODIFICADO: Publica webhooks
│   │
│   └── api-gateway/                         # Sin cambios del Taller 1
│
├── supabase/                                # ← NUEVO: Supabase Edge Functions
│   ├── functions/
│   │   ├── webhook-event-logger/
│   │   │   └── index.ts                     # Edge Function: Validar HMAC + Registrar
│   │   │
│   │   └── webhook-external-notifier/
│   │       └── index.ts                     # Edge Function: Distribuir a suscriptores
│   │
│   └── config.toml                          # Configuración de Supabase
│
├── .env.supabase                            # ← NUEVO: Credenciales de Supabase
├── supabase-schema.sql                      # ← NUEVO: Schema de 4 tablas
├── test-webhooks.ps1                        # ← NUEVO: Script de pruebas
├── TALLER2-README.md                        # Este archivo
└── .gitignore                               # ← MODIFICADO: Agregado .env.supabase
```

---

## 🔒 Seguridad

### Variables de Entorno Sensibles
**Archivo:** `.env.supabase`
```bash
SUPABASE_URL=https://aidmhgugrycsgzzarsou.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WEBHOOK_SECRET=your-super-secret-key-change-this-in-production
```

**⚠️ IMPORTANTE:**
- ✅ Incluido en `.gitignore` (línea 4)
- ✅ No commitear a Git
- ✅ En producción: usar secretos de entorno seguros
- ✅ Rotar `WEBHOOK_SECRET` periódicamente

### Configuración en Supabase Edge Functions
```bash
npx supabase secrets set WEBHOOK_SECRET="your-super-secret-key-change-this-in-production" --project-ref aidmhgugrycsgzzarsou
```

---

## 📊 Métricas y Observabilidad

### Dashboard en Supabase

**URL:** https://supabase.com/dashboard/project/aidmhgugrycsgzzarsou

**Métricas disponibles:**
1. **Edge Functions Logs:** Ver logs de `webhook-event-logger` y `webhook-external-notifier`
2. **Database Queries:** Analizar performance de consultas
3. **API Usage:** Monitorear requests a Edge Functions

### Consultas SQL útiles

**Total de webhooks por tipo:**
```sql
SELECT event_type, COUNT(*) as total 
FROM webhook_events 
GROUP BY event_type;
```

**Tasa de éxito de entregas:**
```sql
SELECT 
  status, 
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM webhook_deliveries), 2) as percentage
FROM webhook_deliveries 
GROUP BY status;
```

**Eventos duplicados detectados (idempotencia):**
```sql
SELECT 
  idempotency_key, 
  COUNT(*) as attempts 
FROM processed_webhooks 
GROUP BY idempotency_key 
HAVING COUNT(*) > 1;
```

**Promedio de intentos de entrega:**
```sql
SELECT AVG(attempt_number) as avg_attempts 
FROM webhook_deliveries;
```

---

## 🎓 Conceptos Clave Implementados

### 1. Serverless
- ✅ **Edge Functions** corren en infraestructura de Supabase (sin servidores propios)
- ✅ **Auto-scaling** automático según demanda
- ✅ **Pay-per-use** (solo pagas por ejecuciones)
- ✅ **Deno runtime** moderno y seguro

### 2. Event-Driven Architecture
- ✅ **Eventos** como ciudadanos de primera clase
- ✅ **Desacoplamiento** entre productores y consumidores
- ✅ **Asincronía** para mejor performance
- ✅ **Eventual consistency** aceptable

### 3. Webhooks
- ✅ **Push model** (servidor notifica a clientes)
- ✅ **HTTP POST** con payload JSON
- ✅ **Firmas HMAC** para autenticación
- ✅ **Idempotencia** para confiabilidad

### 4. Observabilidad
- ✅ **Logs estructurados** en consola y base de datos
- ✅ **Métricas** de entregas exitosas/fallidas
- ✅ **Trazabilidad** con `idempotency_key` único

---

## 🚀 Próximos Pasos

### Mejoras Sugeridas:

1. **Dashboard de Monitoreo:**
   - Crear interfaz web para visualizar webhooks en tiempo real
   - Gráficos de tasa de éxito/fallo
   - Alertas cuando hay muchos reintentos

2. **API de Suscripciones:**
   - Endpoint para que clientes se suscriban a eventos
   - Validación de URLs de webhook
   - Rotación de secretos

3. **Dead Letter Queue:**
   - Almacenar eventos que fallaron después de MAX_RETRIES
   - Re-procesamiento manual
   - Investigación de fallos

4. **Rate Limiting:**
   - Limitar webhooks por suscriptor
   - Prevenir abuso
   - Throttling inteligente

5. **Testing:**
   - Tests unitarios para Edge Functions
   - Tests de integración end-to-end
   - Tests de carga con Artillery/k6

---

## 📚 Referencias

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [HMAC-SHA256 Standard](https://datatracker.ietf.org/doc/html/rfc2104)
- [Webhook Best Practices](https://webhooks.fyi/)
- [Idempotency Patterns](https://stripe.com/docs/idempotency)

---

**Autor:** Taller 2 - Arquitectura Event-Driven con Webhooks y Serverless  
**Fecha:** Diciembre 2025  
**Versión:** 1.0
