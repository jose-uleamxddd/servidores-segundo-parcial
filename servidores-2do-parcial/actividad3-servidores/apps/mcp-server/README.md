# MCP Server - Sistema de Pedidos y Productos

Servidor MCP (Model Context Protocol) que expone herramientas (Tools) para interactuar con el sistema de microservicios mediante JSON-RPC 2.0.

## 🎯 Propósito

Este servidor permite que modelos de IA (como Gemini o Claude) orquesten operaciones del sistema de pedidos de forma inteligente, decidiendo qué herramientas ejecutar según la intención del usuario.

## 🛠️ Tools Disponibles

### 1. buscar_producto
Busca productos por ID o nombre.

**Parámetros:**
- `id` (number, opcional): ID del producto
- `nombre` (string, opcional): Nombre o parte del nombre

**Ejemplo:**
```json
{
  "name": "buscar_producto",
  "arguments": {
    "nombre": "Laptop"
  }
}
```

### 2. validar_stock
Valida si hay stock suficiente para un pedido.

**Parámetros:**
- `productId` (number, requerido): ID del producto
- `cantidad` (number, requerido): Cantidad requerida

**Ejemplo:**
```json
{
  "name": "validar_stock",
  "arguments": {
    "productId": 1,
    "cantidad": 5
  }
}
```

### 3. crear_pedido
Crea un nuevo pedido.

**Parámetros:**
- `productId` (number, requerido): ID del producto
- `cantidad` (number, requerido): Cantidad a pedir
- `cliente` (string, opcional): Nombre del cliente

**Ejemplo:**
```json
{
  "name": "crear_pedido",
  "arguments": {
    "productId": 1,
    "cantidad": 2,
    "cliente": "Juan Pérez"
  }
}
```

## 🚀 Instalación y Uso

### 1. Instalar dependencias
```bash
cd apps/mcp-server
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
PORT=3001
BACKEND_URL=http://localhost:3000
LOG_LEVEL=info
```

### 3. Compilar TypeScript
```bash
npm run build
```

### 4. Iniciar servidor

**Modo desarrollo (con watch):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

## 📡 Endpoints

### POST /rpc
Endpoint principal JSON-RPC 2.0

**Ejemplo - Listar tools:**
```bash
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

**Ejemplo - Ejecutar tool:**
```bash
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "buscar_producto",
      "arguments": {
        "id": 1
      }
    },
    "id": 2
  }'
```

### GET /health
Verificar estado del servidor

```bash
curl http://localhost:3001/health
```

### GET /tools
Listar tools disponibles

```bash
curl http://localhost:3001/tools
```

## 🏗️ Arquitectura

```
┌─────────────────┐
│   AI Model      │ (Gemini/Claude)
│   (API Gateway) │
└────────┬────────┘
         │ JSON-RPC 2.0
         ▼
┌─────────────────┐
│   MCP Server    │ (Este servidor)
│   Port 3001     │
└────────┬────────┘
         │ HTTP REST
         ▼
┌─────────────────┐
│   Backend       │ (Microservicios)
│   Port 3000     │
└─────────────────┘
```

## 📚 Protocolo JSON-RPC 2.0

### Métodos Disponibles

#### tools/list
Lista todos los tools disponibles.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [...],
    "total": 3
  },
  "id": 1
}
```

#### tools/call
Ejecuta un tool específico.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_producto",
    "arguments": {
      "id": 1
    }
  },
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Producto encontrado: Laptop - Stock: 10 unidades"
      }
    ],
    "isError": false,
    "_meta": {
      "success": true,
      "data": { ... }
    }
  },
  "id": 2
}
```

#### ping
Verificar estado del servidor.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "id": 3
}
```

## 🔧 Desarrollo

### Estructura del Proyecto
```
mcp-server/
├── src/
│   ├── server.ts              # Servidor Express + JSON-RPC
│   ├── types.ts               # Tipos TypeScript
│   ├── services/
│   │   └── backend-client.ts  # Cliente HTTP para backend
│   └── tools/
│       ├── registry.ts        # Registro de tools
│       ├── buscar-producto.tool.ts
│       ├── validar-stock.tool.ts
│       └── crear-pedido.tool.ts
├── package.json
├── tsconfig.json
└── .env
```

### Scripts Disponibles
- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar en producción
- `npm run watch` - Desarrollo con nodemon

## 🐛 Debugging

El servidor incluye logging detallado:

```
[2026-01-06T10:30:00.000Z] POST /rpc
[RPC] tools/call - Ejecutando tool: buscar_producto
[Registry] Ejecutando tool: buscar_producto
[BackendClient] GET /products/1
[BackendClient] Response: 200
[Registry] Resultado: Éxito
```

## 📝 Notas Importantes

1. **Backend debe estar corriendo**: El servidor MCP requiere que el backend esté disponible en la URL configurada.

2. **Idempotencia**: Los pedidos se procesan de forma asíncrona. El estado inicial es PENDING y luego cambia a CONFIRMED o REJECTED.

3. **Validación**: Todos los parámetros se validan antes de ejecutar los tools.

4. **Errores**: Los errores se retornan siguiendo el estándar JSON-RPC 2.0.

## 🔗 Referencias

- [Model Context Protocol](https://modelcontextprotocol.io)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Jayson (JSON-RPC library)](https://github.com/tedeh/jayson)
