# 🚀 Guía Rápida de Inicio - Sistema MCP con Gemini AI

**Sistema de Pedidos Inteligente con Orquestación por IA**

---

## 📚 ¿Qué es este Sistema?

Este sistema te permite **hablar con tu aplicación de pedidos usando lenguaje natural**. La Inteligencia Artificial (Gemini de Google) entiende lo que quieres hacer y ejecuta automáticamente las operaciones necesarias.

### Ejemplo Rápido

**Tú escribes**: "Quiero comprar 3 laptops para mi empresa"

**El sistema**:
1. 🔍 Busca el producto "laptop"
2. ✅ Verifica que haya stock para 3 unidades
3. 📦 Crea automáticamente el pedido
4. 💬 Te responde: "He creado tu pedido de 3 Laptop Dell XPS 15 por $3,899.97. El pedido #123 ha sido confirmado..."

---

## 🏗️ Arquitectura del Sistema

```
Tú (Usuario)
    ↓ "Quiero comprar 3 laptops"
    
API Gateway AI (Puerto 3000)
    ↓ Gemini AI decide qué hacer
    
MCP Server (Puerto 3001)
    ↓ Ejecuta herramientas
    
Backend (Microservicios)
    ↓ Procesa pedidos
    
Base de Datos MySQL
```

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Iniciar Infraestructura

```bash
# Iniciar Docker (RabbitMQ + MySQL)
docker-compose up -d

# Esperar 30 segundos
```

### 2️⃣ Insertar Datos de Prueba

```bash
# Ejecutar script de datos
./insert-test-data.ps1
```

Esto crea 10 productos de ejemplo (laptops, teclados, mouse, etc.)

### 3️⃣ Iniciar Servicios

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

### 4️⃣ ¡Probar!

**Opción A** - Script de pruebas:
```bash
./test-end-to-end.ps1
```

**Opción B** - Manualmente con curl:
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué productos tienen?"}'
```

---

## 💬 Ejemplos de lo que Puedes Decir

### 🔍 Consultas

```
"¿Qué productos tienen disponibles?"
"Muéstrame información sobre las laptops"
"¿Cuánto cuestan los auriculares?"
"Lista todos los productos con precio menor a $100"
```

### ✅ Validaciones

```
"¿Hay stock de laptops para 5 unidades?"
"¿Puedo comprar 10 teclados?"
"Verifica disponibilidad de mouse"
```

### 📦 Pedidos

```
"Quiero comprar 3 laptops"
"Créame un pedido de 2 monitores"
"Necesito 5 teclados para mi oficina"
"Haz un pedido de 1 silla ergonómica para Juan Pérez"
```

### 🧠 Operaciones Complejas

```
"Busca laptops, verifica si hay 5 disponibles y créame un pedido"
"Si hay stock de mouse, créame un pedido de 10 unidades"
"¿Cuánto costaría comprar 3 laptops y 3 teclados?"
"Busca el producto más caro y dime si hay stock"
```

---

## 🎯 Endpoints Disponibles

### POST /ai/ask
**Haz cualquier pregunta en lenguaje natural**

```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tu pregunta aquí"
  }'
```

### GET /ai/tools
**Ver herramientas disponibles**

```bash
curl http://localhost:3000/ai/tools
```

### GET /ai/health
**Verificar estado del sistema**

```bash
curl http://localhost:3000/ai/health
```

---

## 🛠️ Herramientas Disponibles

El sistema tiene 3 herramientas que Gemini puede usar:

### 1. buscar_producto
- Busca productos por ID o nombre
- Ejemplo: "Busca laptop"

### 2. validar_stock
- Verifica disponibilidad de stock
- Ejemplo: "¿Hay 5 laptops?"

### 3. crear_pedido
- Crea nuevos pedidos
- Ejemplo: "Compra 3 laptops"

---

## 📊 Productos de Ejemplo

Después de ejecutar `insert-test-data.ps1` tendrás:

| ID | Producto | Precio | Stock |
|----|----------|--------|-------|
| 1 | Laptop Dell XPS 15 | $1,299.99 | 15 |
| 2 | Teclado Mecánico Logitech | $89.99 | 50 |
| 3 | Mouse Inalámbrico | $29.99 | 100 |
| 4 | Monitor Samsung 27" | $349.99 | 25 |
| 5 | Auriculares Sony | $399.99 | 30 |
| 6 | Webcam Logitech | $79.99 | 40 |
| 7 | Disco SSD 1TB | $129.99 | 60 |
| 8 | Silla Ergonómica | $1,499.99 | 10 |
| 9 | Hub USB-C | $49.99 | 80 |
| 10 | Lámpara LED | $39.99 | 45 |

---

## 🔧 Solución de Problemas

### ❌ "No se puede conectar con MCP Server"

**Solución**: Inicia el MCP Server
```bash
npm run start:mcp
```

### ❌ "Backend no disponible"

**Solución**: Inicia el backend
```bash
npm run start:all
```

### ❌ "Error en Gemini"

**Solución**: Verifica tu API Key en `.env`
```bash
cd apps/api-gateway-ai
cat .env
```

### ❌ "No hay productos"

**Solución**: Inserta datos de prueba
```bash
./insert-test-data.ps1
```

---

## 📖 Flujo Completo de Ejemplo

### Paso 1: Usuario hace una pregunta
```
"Quiero comprar 5 laptops para mi empresa"
```

### Paso 2: Gemini AI analiza
```
Necesito:
1. Buscar el producto "laptop"
2. Verificar si hay 5 unidades
3. Crear el pedido
```

### Paso 3: Sistema ejecuta automáticamente
```
✅ buscar_producto("laptop") → Laptop Dell XPS 15 ($1,299.99)
✅ validar_stock(productId=1, cantidad=5) → Stock disponible (15 unidades)
✅ crear_pedido(productId=1, cantidad=5) → Pedido #123 creado
```

### Paso 4: Gemini consolida la respuesta
```
"He creado tu pedido de 5 Laptop Dell XPS 15 por un total de $6,499.95.
El pedido #123 ha sido confirmado exitosamente y está siendo procesado.
Stock restante: 10 unidades."
```

---

## 🎓 Conceptos Clave

### MCP (Model Context Protocol)
Protocolo que permite a la IA interactuar con herramientas de forma inteligente.

### Function Calling
Gemini decide qué funciones ejecutar según el contexto.

### Orquestación Inteligente
La IA ejecuta múltiples operaciones en el orden correcto.

### Idempotencia
Los pedidos no se duplican aunque se reintenten.

---

## 📝 Comandos Útiles

```bash
# Iniciar todo
npm run start:all:ai

# Ver logs del MCP Server
cd apps/mcp-server && npm run dev

# Ver logs del AI Gateway
cd apps/api-gateway-ai && npm run start:dev

# Reiniciar base de datos
docker-compose down -v
docker-compose up -d

# Ver productos en BD
docker exec -it mysql-products mysql -uroot -proot -e "SELECT * FROM products_db.products;"

# Ver pedidos en BD
docker exec -it mysql-orders mysql -uroot -proot -e "SELECT * FROM orders_db.orders;"
```

---

## 🚀 Próximos Pasos

1. ✅ Prueba diferentes preguntas
2. ✅ Experimenta con operaciones complejas
3. ✅ Agrega más productos a la BD
4. ✅ Crea tus propios tools personalizados
5. ✅ Integra con un frontend web

---

## 🔗 Enlaces Útiles

- **Gemini AI Studio**: https://aistudio.google.com
- **MCP Documentation**: https://modelcontextprotocol.io
- **NestJS Docs**: https://nestjs.com

---

## 📞 Ayuda

Si tienes problemas:
1. Verifica que todos los servicios estén corriendo
2. Revisa los logs en las terminales
3. Ejecuta el script de pruebas: `./test-end-to-end.ps1`
4. Consulta los archivos README en cada carpeta

---

**¡Disfruta tu sistema inteligente de pedidos! 🎉**
