# 🚀 Guía de Inicio Rápido - 10 Minutos

Esta guía te llevará de cero a sistema funcional en menos de 10 minutos.

## ✅ Checklist Previo

- [ ] Node.js v18+ instalado
- [ ] Docker Desktop en ejecución
- [ ] Puertos libres: 3000, 3001, 3306, 3307, 3308, 5672
- [ ] Conexión a Internet (para Gemini API)

## 📝 Paso 1: Obtener API Key de Gemini (2 min)

1. Ir a https://aistudio.google.com
2. Hacer clic en "Get API Key"
3. Crear un nuevo proyecto o usar uno existente
4. Copiar la API Key generada

**¡IMPORTANTE!** Guarda esta key, la necesitarás en el Paso 3.

## 📦 Paso 2: Instalar Dependencias (3 min)

```bash
# En la raíz del proyecto
npm install

# MCP Server
cd apps/mcp-server
npm install
cd ../..

# AI Gateway
cd apps/api-gateway-ai
npm install
cd ../..
```

**Tiempo estimado:** 2-3 minutos dependiendo de tu conexión.

## 🔑 Paso 3: Configurar API Key (30 segundos)

Editar el archivo `apps/api-gateway-ai/.env`:

```env
GEMINI_API_KEY=tu-api-key-aqui
MCP_SERVER_URL=http://localhost:3001
```

Reemplaza `tu-api-key-aqui` con la key del Paso 1.

## 🐳 Paso 4: Iniciar Infraestructura (1 min)

```bash
docker-compose up -d
```

Esperar 30 segundos a que los contenedores estén listos.

**Verificar:**
```bash
docker ps
```

Deberías ver: RabbitMQ, MySQL Products, MySQL Orders.

## 💾 Paso 5: Insertar Datos de Prueba (30 segundos)

```bash
./insert-test-data.ps1
```

Esto insertará 10 productos:
- Laptop Dell XPS 15 ($1299.99, stock: 15)
- Teclado Mecánico RGB ($89.99, stock: 50)
- Mouse Gaming Logitech ($29.99, stock: 100)
- Monitor 4K Samsung ($399.99, stock: 25)
- Y 6 productos más...

## 🚀 Paso 6: Iniciar Servicios (1 min)

**Opción A - Todo en una terminal:**
```bash
npm run start:all:ai
```

**Opción B - Terminales separadas (recomendado para debugging):**

Terminal 1 - Backend:
```bash
npm run start:all
```

Terminal 2 - MCP Server:
```bash
npm run start:mcp
```

Terminal 3 - AI Gateway:
```bash
npm run start:ai
```

**Esperar a ver:**
```
✅ API Gateway: Listening on http://localhost:3000
✅ MCP Server: JSON-RPC Server running on port 3001
✅ AI Gateway: NestJS application successfully started
```

## ✨ Paso 7: ¡Primera Prueba! (1 min)

```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"¿Qué productos tienen disponibles?\"}"
```

**Respuesta esperada:**
```json
{
  "response": "Tenemos disponibles los siguientes productos: Laptop Dell XPS 15 por $1299.99 con 15 unidades, Teclado Mecánico RGB por $89.99 con 50 unidades, Mouse Gaming Logitech por $29.99 con 100 unidades...",
  "toolCalls": [
    {
      "tool": "buscar_producto",
      "result": { ... }
    }
  ]
}
```

## 🧪 Paso 8: Pruebas Automatizadas (2 min)

```bash
# Probar MCP Server (10 tests)
./test-mcp-server.ps1

# Probar AI Gateway (10 tests)
./test-ai-gateway.ps1

# Pruebas End-to-End (12 tests)
./test-end-to-end.ps1
```

## 🎯 Ejemplos Rápidos

### Consultar Productos
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"¿Cuánto cuesta la laptop?\"}"
```

### Validar Stock
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"¿Hay stock para comprar 10 teclados?\"}"
```

### Crear Pedido
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Quiero comprar 3 laptops para Juan Pérez\"}"
```

### Operación Compleja
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Busca mouse gaming, verifica si hay 5 disponibles y créame un pedido si hay stock\"}"
```

## 🔍 Verificar Datos en Base de Datos

```bash
# Ver productos
docker exec -it mysql-products mysql -uroot -proot \
  -e "SELECT * FROM products_db.products;"

# Ver pedidos
docker exec -it mysql-orders mysql -uroot -proot \
  -e "SELECT * FROM orders_db.orders;"

# Ver eventos procesados (idempotencia)
docker exec -it mysql-products mysql -uroot -proot \
  -e "SELECT * FROM products_db.processed_events;"
```

## 📊 Monitorear el Sistema

### Health Checks
```bash
# AI Gateway
curl http://localhost:3000/ai/health

# Listar herramientas disponibles
curl http://localhost:3000/ai/tools
```

### RabbitMQ Management
Abrir en navegador: http://localhost:15672
- Usuario: `guest`
- Contraseña: `guest`

### Logs en Tiempo Real
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Solo RabbitMQ
docker-compose logs -f rabbitmq

# Solo MySQL Products
docker-compose logs -f mysql-products
```

## ❌ Troubleshooting

### Error: "ECONNREFUSED localhost:3001"
**Problema:** MCP Server no está corriendo.
**Solución:** Ejecutar `npm run start:mcp` en otra terminal.

### Error: "Invalid API Key"
**Problema:** API Key de Gemini incorrecta o no configurada.
**Solución:** Verificar `apps/api-gateway-ai/.env` y obtener una nueva key.

### Error: "Port 3000 already in use"
**Problema:** Puerto ocupado.
**Solución:** 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Error: "Cannot connect to MySQL"
**Problema:** Contenedores no están listos.
**Solución:** Esperar 1 minuto después de `docker-compose up -d`.

### Gemini no responde correctamente
**Problema:** El modelo está sobrecargado o necesita esperar.
**Solución:** Agregar `Start-Sleep -Seconds 2` entre requests.

## 🎓 Siguientes Pasos

1. **Leer la Guía de Usuario:** [GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)
2. **Explorar la Arquitectura:** [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Documentación Técnica:** [DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md)
4. **Probar más ejemplos:** Ver 40+ ejemplos en GUIA-USUARIO-FINAL.md

## 📝 Comandos Útiles

```bash
# Detener todo
docker-compose down
Ctrl + C en cada terminal

# Limpiar base de datos
docker-compose down -v
docker-compose up -d
./insert-test-data.ps1

# Reinstalar dependencias
rm -rf node_modules apps/*/node_modules
npm install
cd apps/mcp-server && npm install && cd ../..
cd apps/api-gateway-ai && npm install && cd ../..

# Ver estado de contenedores
docker ps
docker stats

# Ver logs específicos
docker-compose logs -f api-gateway
docker-compose logs -f orders-service
docker-compose logs -f products-service
```

## ✅ Checklist Final

- [ ] Todos los servicios iniciados sin errores
- [ ] Health checks respondiendo OK
- [ ] Datos de prueba insertados
- [ ] Primera consulta con IA funcionando
- [ ] Scripts de prueba ejecutados exitosamente

## 🎉 ¡Listo!

Ahora tienes un sistema completo de microservicios con IA funcionando.

**¿Preguntas?** Revisa:
- [GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md) para más ejemplos
- [DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md) para detalles técnicos
- [ARCHITECTURE.md](./ARCHITECTURE.md) para entender la arquitectura
