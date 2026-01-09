# API Gateway AI con Gemini

API Gateway inteligente que usa Google Gemini para orquestar operaciones del sistema mediante Model Context Protocol (MCP).

## 🎯 ¿Qué hace?

Este gateway permite interactuar con el sistema usando **lenguaje natural**. Gemini AI decide automáticamente qué operaciones ejecutar según la intención del usuario.

## ✨ Características

- 🤖 **IA Conversacional**: Habla con el sistema en lenguaje natural
- 🔧 **Function Calling**: Gemini decide qué herramientas usar
- 🔄 **Ejecución Automática**: Los tools se ejecutan automáticamente
- 📊 **Respuestas Inteligentes**: Gemini consolida y presenta los resultados

## 🏗️ Arquitectura

```
Usuario
  │
  │ "Quiero comprar 5 laptops"
  ▼
┌─────────────────────┐
│  API Gateway AI     │
│  (NestJS + Gemini)  │
│  Puerto 3000        │
└──────┬──────────────┘
       │
       │ 1. Consulta tools disponibles
       ▼
┌─────────────────────┐
│    MCP Server       │
│  (JSON-RPC 2.0)     │
│  Puerto 3001        │
└──────┬──────────────┘
       │
       │ Retorna: [buscar_producto, validar_stock, crear_pedido]
       ▼
┌─────────────────────┐
│  Gemini AI          │
│  (Google Cloud)     │
└──────┬──────────────┘
       │
       │ Decide: 
       │ 1. buscar_producto("laptop")
       │ 2. validar_stock(productId=1, cantidad=5)
       │ 3. crear_pedido(productId=1, cantidad=5)
       ▼
    Ejecuta automáticamente
```

## 🚀 Instalación

### 1. Instalar dependencias
```bash
cd apps/api-gateway-ai
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
PORT=3000
GEMINI_API_KEY=tu-api-key-aqui
MCP_SERVER_URL=http://localhost:3001
```

### 3. Iniciar el servidor
```bash
npm run start:dev
```

## 📡 Endpoints

### POST /ai/ask
Hacer preguntas a la IA en lenguaje natural.

**Request:**
```json
{
  "message": "Quiero comprar 2 laptops"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Quiero comprar 2 laptops",
  "answer": "He creado el pedido exitosamente. El pedido #123 de 2 laptops ha sido confirmado...",
  "timestamp": "2026-01-06T10:30:00.000Z"
}
```

### GET /ai/tools
Listar tools disponibles.

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "name": "buscar_producto",
      "description": "Busca un producto por ID o nombre"
    }
  ],
  "total": 3
}
```

### GET /ai/health
Estado del sistema.

**Response:**
```json
{
  "status": "ok",
  "services": {
    "api_gateway": "ok",
    "mcp_server": "ok",
    "gemini": "ok"
  }
}
```

## 💬 Ejemplos de Uso

### Ejemplo 1: Buscar un producto
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué productos tienen disponibles?"
  }'
```

### Ejemplo 2: Verificar stock
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Hay stock de laptops para 10 unidades?"
  }'
```

### Ejemplo 3: Crear pedido
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito comprar 3 laptops para el departamento de IT"
  }'
```

### Ejemplo 4: Operación compleja
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Busca el producto Laptop, verifica si hay stock para 5 unidades y si hay, créame un pedido"
  }'
```

## 🔄 Flujo de Ejecución

1. **Usuario envía mensaje**: "Quiero 5 laptops"

2. **Gateway obtiene tools**: Consulta MCP Server para ver herramientas disponibles

3. **Gemini analiza**: La IA decide qué tools ejecutar:
   - `buscar_producto` con `nombre: "laptop"`
   - `validar_stock` con `productId: 1, cantidad: 5`
   - `crear_pedido` con `productId: 1, cantidad: 5`

4. **Ejecución automática**: El gateway ejecuta cada tool secuencialmente

5. **Gemini consolida**: La IA genera una respuesta en lenguaje natural

6. **Respuesta al usuario**: "He creado tu pedido de 5 laptops..."

## 🧠 Capacidades de la IA

Gemini puede:
- ✅ Entender contexto e intención del usuario
- ✅ Decidir qué herramientas usar y en qué orden
- ✅ Manejar errores y sugerir alternativas
- ✅ Hacer preguntas de clarificación si falta información
- ✅ Ejecutar múltiples operaciones en secuencia
- ✅ Consolidar resultados en respuestas naturales

## 📝 Preguntas que puedes hacer

### Búsqueda
- "¿Qué productos tienen?"
- "Muéstrame información de la laptop"
- "Busca productos con precio menor a $1000"

### Validación
- "¿Hay stock de laptops?"
- "¿Puedo comprar 10 teclados?"
- "Verifica disponibilidad para 5 unidades del producto 2"

### Pedidos
- "Quiero comprar 3 laptops"
- "Créame un pedido de 2 teclados"
- "Necesito 10 mouse para mi empresa"

### Combinadas
- "Busca laptops, verifica si hay 5 disponibles y créame un pedido"
- "¿Cuántas laptops hay y cuánto cuestan?"
- "Si hay stock, créame un pedido de 3 laptops"

## 🔧 Desarrollo

### Estructura del Proyecto
```
api-gateway-ai/
├── src/
│   ├── main.ts                    # Punto de entrada
│   ├── app.module.ts              # Módulo principal
│   ├── ai/
│   │   ├── ai.controller.ts       # Controlador HTTP
│   │   ├── ai.module.ts           # Módulo AI
│   │   └── dto/
│   │       └── ask-ai.dto.ts      # DTO de validación
│   ├── gemini/
│   │   └── gemini.service.ts      # Servicio Gemini
│   └── mcp-client/
│       └── mcp-client.service.ts  # Cliente MCP
├── package.json
├── tsconfig.json
└── .env
```

### Scripts Disponibles
- `npm run start:dev` - Desarrollo con hot reload
- `npm run start` - Iniciar en modo producción
- `npm run build` - Compilar el proyecto

## 🐛 Troubleshooting

### Error: GEMINI_API_KEY no configurada
Asegúrate de tener la API Key en el archivo `.env`.

### Error: No se puede conectar con MCP Server
Verifica que el MCP Server esté corriendo en el puerto 3001:
```bash
# En otra terminal
cd apps/mcp-server
npm run dev
```

### Error: Backend no disponible
El MCP Server necesita que el backend esté corriendo:
```bash
# En otra terminal
npm run start:all
```

## 📚 Referencias

- [Google Gemini API](https://ai.google.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [NestJS](https://nestjs.com/)

## 🔐 Seguridad

⚠️ **Importante**:
- No compartas tu `GEMINI_API_KEY` públicamente
- No subas el archivo `.env` a git
- La API Key tiene límites de uso gratuito
- Monitorea tu uso en [Google AI Studio](https://aistudio.google.com)
