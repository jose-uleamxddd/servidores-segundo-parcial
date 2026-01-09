# 🤖 Sistema de Pedidos Inteligente con IA - MCP + Gemini

Sistema de microservicios con **Inteligencia Artificial** que permite interactuar usando **lenguaje natural**. Implementa Model Context Protocol (MCP) con integración de Google Gemini para orquestación inteligente de servicios.

## ✨ Características Principales

- 🤖 **IA Conversacional**: Habla con el sistema en lenguaje natural
- 🔧 **Orquestación Inteligente**: Gemini decide qué operaciones ejecutar
- 📦 **Microservicios**: Arquitectura distribuida con NestJS
- 🔄 **MCP Protocol**: Protocolo estándar para IA + herramientas
- ⚡ **Function Calling**: Ejecución automática de herramientas
- 🛡️ **Idempotencia**: Prevención de operaciones duplicadas
- 📊 **Webhooks**: Notificaciones a sistemas externos

## 🏗️ Arquitectura Completa

```
Usuario: "Quiero comprar 3 laptops"
         ↓
┌─────────────────────────────┐
│  API Gateway AI             │  🤖 Gemini AI
│  Puerto 3000                │  + Function Calling
└────────────┬────────────────┘
             │ JSON-RPC 2.0
             ▼
┌─────────────────────────────┐
│  MCP Server                 │  🔧 Tools Registry
│  Puerto 3001                │  (buscar, validar, crear)
└────────────┬────────────────┘
             │ HTTP REST
             ▼
┌─────────────────────────────┐
│  Backend Microservicios     │  📦 Orders + Products
│  + RabbitMQ + MySQL         │  + Webhooks + Supabase
└─────────────────────────────┘
```

## 🎯 Componentes del Sistema

### 1. API Gateway AI (Puerto 3000)
- NestJS + Google Gemini AI
- Procesa lenguaje natural
- Function Calling automático
- Orquestación inteligente

### 2. MCP Server (Puerto 3001)
- JSON-RPC 2.0
- Registro de herramientas (Tools)
- Ejecución de operaciones
- Comunicación con backend

### 3. Backend Microservicios
- **API Gateway** (Puerto 3000): HTTP REST tradicional
- **Orders Service**: Gestión de pedidos
- **Products Service**: Gestión de inventario con idempotencia
- **RabbitMQ**: Mensajería asíncrona
- **MySQL**: Bases de datos independientes

## 📋 Prerequisitos

- Node.js v18+
- Docker y Docker Compose
- npm o yarn
- **API Key de Google Gemini** (gratuita en https://aistudio.google.com)

## ⚡ Inicio Rápido (5 minutos)

### 1. Instalar Dependencias

```bash
# Dependencias principales
npm install

# MCP Server
cd apps/mcp-server && npm install && cd ../..

# AI Gateway
cd apps/api-gateway-ai && npm install && cd ../..
```

### 2. Configurar API Key de Gemini

Editar `apps/api-gateway-ai/.env`:
```env
GEMINI_API_KEY=tu-api-key-aqui
```

### 3. Iniciar Infraestructura

```bash
docker-compose up -d
# Esperar 30 segundos
```

### 4. Insertar Datos de Prueba

```bash
./insert-test-data.ps1
```

### 5. Iniciar Servicios

**Terminal 1** - Backend:
```bash
npm run start:all
```

**Terminal 2** - MCP Server:
```bash
npm run start:mcp
```

**Terminal 3** - AI Gateway:
```bash
npm run start:ai
```

### 6. ¡Probar!

```bash
# Script automático
./test-end-to-end.ps1

# O manualmente
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué productos tienen?"}'
```

## � Ejemplos de Uso con IA

### Preguntas que puedes hacer:

**Consultas:**
```
"¿Qué productos tienen disponibles?"
"Muéstrame información sobre las laptops"
"¿Cuánto cuesta el teclado mecánico?"
```

**Validaciones:**
```
"¿Hay stock para comprar 5 laptops?"
"¿Puedo comprar 10 teclados?"
```uebas del Sistema

### Pruebas Automatizadas

```bash
# Pruebas completas end-to-end (12 tests)
./test-end-to-end.ps1

# Pruebas del MCP Server
./test-mcp-server.ps1

# Pruebas del AI Gateway
./test-ai-gateway.ps1
```

### Pruebas Manuales con IA

```bash
# Pregunta simple
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué productos tienen?"}'

# Crear pedido con IA
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "Quiero comprar 3 laptops"}'
```

### Verificar Datos en BD

```bash
# Ver productos
docker exec -it mysql-products mysql -uroot -proot -e "SELECT * FROM products_db.products;"

# Ver pedidos
docker exec -it mysql-orders mysql -uroot -proot -e "SELECT * FROM orders_db.orders;" productos:
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

## 📚 Documentación Completa

### 🚀 Para Empezar
- **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** - De 0 a sistema funcionando en 10 minutos
- **[CHECKLIST-COMPLETO.md](./CHECKLIST-COMPLETO.md)** - Verificación paso a paso
- **[INDEX.md](./INDEX.md)** - Índice de toda la documentación

### 📖 Guías de Usuario
- **[GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)** - 40+ ejemplos de uso con IA
- **[SISTEMA-COMPLETO.md](./SISTEMA-COMPLETO.md)** - Resumen ejecutivo

### 🏗️ Documentación Técnica
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagramas y arquitectura
- **[DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md)** - APIs y código
- **[DOCUMENTACION-COMPLETA-DEL-PROYECTO.md](./DOCUMENTACION-COMPLETA-DEL-PROYECTO.md)** - Sistema base

### 🤖 Implementación MCP + IA
- **[PASO-1-MCP-SERVER-COMPLETADO.md](./PASO-1-MCP-SERVER-COMPLETADO.md)** - MCP Server (JSON-RPC)
- **[PASO-2-AI-GATEWAY-COMPLETADO.md](./PASO-2-AI-GATEWAY-COMPLETADO.md)** - AI Gateway (Gemini)
- **[PASO-3-FINAL-COMPLETADO.md](./PASO-3-FINAL-COMPLETADO.md)** - Testing y optimización

### 🧪 Testing
- **[GUIA-PRUEBAS.md](./GUIA-PRUEBAS.md)** - Manual de pruebas
- **Scripts:** `test-mcp-server.ps1`, `test-ai-gateway.ps1`, `test-end-to-end.ps1`

## 🎯 Próximos Pasos (Opcional)

### Mejoras Implementadas ✅
- ✅ Idempotencia con eventos procesados
- ✅ Webhooks a Supabase
- ✅ MCP Server con JSON-RPC 2.0
- ✅ AI Gateway con Gemini
- ✅ Function Calling
- ✅ Suite de pruebas completa
- ✅ Documentación exhaustiva

### Extensiones Sugeridas
- Frontend web (React/Vue)
- Más herramientas MCP (actualizar, cancelar, listar)
- Autenticación JWT
- Rate limiting
- Caché con Redis
- Monitoreo con Prometheus + Grafana
- CI/CD con GitHub Actions
- Despliegue con Kubernetes

---

## 📞 Soporte

Para más información, consulta:
- [INDEX.md](./INDEX.md) - Navegación de documentos
- [INICIO-RAPIDO.md](./INICIO-RAPIDO.md) - Troubleshooting

**Versión:** 1.0.0  
**Licencia:** MIT  
**Desarrollado con ❤️ para Arquitectura de Servidores**
