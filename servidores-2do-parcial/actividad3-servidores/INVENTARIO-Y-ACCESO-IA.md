# 📦 Inventario de Productos y Acceso del Agente IA

## 🗄️ Ubicación del Inventario

### Base de Datos MySQL
- **Contenedor Docker**: `mysql`
- **Base de Datos**: `products_db`
- **Puerto**: `3306`
- **Tabla**: `products`
- **Credenciales**: `root/root`

### Estructura de la Tabla
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2),
  stock INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Ver Inventario Directamente
```bash
# Desde PowerShell
docker exec mysql mysql -uroot -proot products_db -e "SELECT id, name, price, stock FROM products;"
```

---

## 🔗 Endpoints de la API

### 1. Listar Todos los Productos
```http
GET http://localhost:3000/products
```
**Respuesta**: Array con todos los productos

### 2. Buscar Productos por Nombre
```http
GET http://localhost:3000/products/search?name=Laptop
```
**Respuesta**: Array con productos que contienen "Laptop"

### 3. Obtener Producto por ID
```http
GET http://localhost:3000/products/1
```
**Respuesta**: Producto con ID 1

---

## 🤖 Acceso del Agente IA

El agente IA accede al inventario a través del **MCP Server** (Model Context Protocol) que expone 4 herramientas:

### 1️⃣ listar_inventario()
**Descripción**: Muestra TODOS los productos del inventario

**Cuándo se usa**:
- Usuario pregunta: "¿Qué productos tienes?"
- Usuario pregunta: "Muéstrame todo"
- Usuario pregunta: "¿Qué vendes?"

**Flujo**:
```
Usuario → AI Gateway (Gemini) → MCP Server → listar_inventario()
                                              ↓
                                    API Gateway (GET /products)
                                              ↓
                                    Products Service (RabbitMQ)
                                              ↓
                                    MySQL (products_db)
```

**Código**:
- **Tool**: `apps/mcp-server/src/tools/listar-inventario.tool.ts`
- **Backend**: `apps/mcp-server/src/services/backend-client.ts` → `getAllProducts()`

---

### 2️⃣ buscar_producto(nombre)
**Descripción**: Busca productos específicos por nombre

**Cuándo se usa**:
- Usuario pregunta: "Busca laptops"
- Usuario pregunta: "Tienes monitores?"

**Parámetros**:
- `nombre`: String - Palabra a buscar (ej: "Laptop", "Mouse")

**Flujo**:
```
Usuario → AI Gateway → MCP Server → buscar_producto(nombre="Laptop")
                                              ↓
                                    GET /products/search?name=Laptop
                                              ↓
                                    Products Service
                                              ↓
                                    MySQL: SELECT * WHERE name LIKE '%Laptop%'
```

**Código**:
- **Tool**: `apps/mcp-server/src/tools/buscar-producto.tool.ts`
- **Backend**: `apps/mcp-server/src/services/backend-client.ts` → `searchProductsByName()`

---

### 3️⃣ validar_stock(productId)
**Descripción**: Verifica si hay stock disponible de un producto

**Parámetros**:
- `productId`: Number - ID del producto a verificar

**Ejemplo**:
```javascript
validar_stock(productId: 1)
// Retorna: { success: true, data: { id: 1, stock: 71, available: true } }
```

**Código**:
- **Tool**: `apps/mcp-server/src/tools/validar-stock.tool.ts`

---

### 4️⃣ crear_pedido(productId, quantity)
**Descripción**: Crea un pedido de un producto

**Parámetros**:
- `productId`: Number - ID del producto
- `quantity`: Number - Cantidad a pedir

**Flujo**:
```
Usuario → AI Gateway → MCP Server → crear_pedido(productId=1, quantity=2)
                                              ↓
                                    POST /orders { productId: 1, quantity: 2 }
                                              ↓
                                    Orders Service → RabbitMQ Event
                                              ↓
                                    Products Service → Reserva Stock
```

**Código**:
- **Tool**: `apps/mcp-server/src/tools/crear-pedido.tool.ts`

---

## 📝 Configuración del Agente

El agente está configurado con instrucciones específicas en:

**Archivo**: `apps/api-gateway-ai/src/gemini/gemini.service.ts`

```typescript
const systemInstruction = `
Eres un asistente de compras inteligente.

HERRAMIENTAS DISPONIBLES:
1. listar_inventario() - Muestra TODOS los productos
2. buscar_producto(nombre) - Busca productos específicos
3. validar_stock(productId) - Verifica stock
4. crear_pedido(productId, quantity) - Crea pedido

REGLAS:
- Si usuario pregunta "qué tienes" → USA listar_inventario()
- Si busca producto específico → USA buscar_producto(nombre)
- Antes de crear pedido → SIEMPRE validar_stock()
`;
```

---

## 🧪 Pruebas

### 1. Probar listar_inventario desde la IA
```
Pregunta al agente: "¿Qué productos tienes?"
Respuesta esperada: Lista completa de 16 productos con ID, nombre, precio y stock
```

### 2. Probar buscar_producto
```
Pregunta al agente: "Busca laptops"
Respuesta esperada: 3 laptops (Laptop, Laptop Dell XPS 15, Laptop Dell XPS 13)
```

### 3. Probar validar_stock
```
Pregunta al agente: "Hay stock del producto 1?"
Respuesta esperada: Sí, hay 71 unidades disponibles
```

### 4. Probar crear_pedido
```
Pregunta al agente: "Quiero comprar 2 laptops"
Respuesta esperada: Pedido creado exitosamente (ID: X)
```

---

## 📊 Inventario Actual (16 Productos)

1. **Laptop** - $999.99 - Stock: 71
2. **Laptop Dell XPS 15** - $1,299.99 - Stock: 15
3. **Mouse Inalámbrico** - $29.99 - Stock: 150
4. **Teclado Mecánico** - $79.99 - Stock: 89
5. **Monitor 27"** - $299.99 - Stock: 45
6. **Webcam HD** - $59.99 - Stock: 78
7. **Auriculares Bluetooth** - $89.99 - Stock: 120
8. **Disco Duro Externo 1TB** - $69.99 - Stock: 200
9. **Cable HDMI** - $12.99 - Stock: 300
10. **Hub USB-C** - $34.99 - Stock: 95
11. **Alfombrilla Gaming** - $24.99 - Stock: 180
12. **Laptop Dell XPS 13** - $1,299.99 - Stock: 15
13. **Soporte para Laptop** - $39.99 - Stock: 60
14. **Micrófono USB** - $79.99 - Stock: 40
15. **Adaptador USB-C a HDMI** - $19.99 - Stock: 150
16. **Cargador USB-C 65W** - $34.99 - Stock: 100

---

## 🔧 Archivos Modificados

### Nuevos Archivos:
1. `apps/mcp-server/src/tools/listar-inventario.tool.ts` ← Nueva herramienta

### Archivos Modificados:
1. `apps/mcp-server/src/tools/registry.ts` ← Registro de listar_inventario
2. `apps/products-service/src/products/products.controller.ts` ← Agregado product.getAll
3. `apps/products-service/src/products/products.service.ts` ← Agregado findAll()
4. `apps/api-gateway/src/orders/products.controller.ts` ← Agregado GET /products
5. `apps/api-gateway-ai/src/gemini/gemini.service.ts` ← Actualizado systemInstruction

---

## 🌐 Interfaz Web

Accede a la interfaz web en: **http://localhost:4000**

**Prueba escribiendo**:
- "¿Qué productos tienes?"
- "Muéstrame todo el catálogo"
- "Busca laptops"
- "Quiero comprar una laptop"
