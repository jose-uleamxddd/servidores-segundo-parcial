# ⚡ Referencia Rápida - Comandos Esenciales

Guía de comandos más usados para trabajar con el sistema.

## 🚀 Inicio y Detención

### Iniciar Todo
```bash
# Opción 1: Todo en una terminal
npm run start:all:ai

# Opción 2: Separado (recomendado)
# Terminal 1:
npm run start:all

# Terminal 2:
npm run start:mcp

# Terminal 3:
npm run start:ai
```

### Detener Todo
```bash
# Ctrl + C en cada terminal

# Detener Docker
docker-compose down
```

### Reiniciar Limpio
```bash
docker-compose down -v
docker-compose up -d
./insert-test-data.ps1
npm run start:all:ai
```

## 🧪 Testing

### Suite Completa
```bash
./test-end-to-end.ps1      # 12 tests E2E
./test-mcp-server.ps1      # 10 tests MCP
./test-ai-gateway.ps1      # 10 tests IA
```

### Tests Individuales
```bash
# Health check AI Gateway
curl http://localhost:3000/ai/health

# Health check MCP Server
curl http://localhost:3001/health

# Listar herramientas
curl http://localhost:3000/ai/tools
```

### Pregunta Rápida a la IA
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué productos tienen?"}'
```

## 💾 Base de Datos

### Ver Productos
```bash
docker exec -it mysql-products mysql -uroot -proot \
  -e "SELECT * FROM products_db.products;"
```

### Ver Pedidos
```bash
docker exec -it mysql-orders mysql -uroot -proot \
  -e "SELECT * FROM orders_db.orders;"
```

### Ver Eventos Procesados (Idempotencia)
```bash
docker exec -it mysql-products mysql -uroot -proot \
  -e "SELECT * FROM products_db.processed_events;"
```

### Insertar Datos de Prueba
```bash
./insert-test-data.ps1
```

### Limpiar Datos
```bash
docker exec -it mysql-products mysql -uroot -proot \
  -e "DELETE FROM products_db.products;"

docker exec -it mysql-orders mysql -uroot -proot \
  -e "DELETE FROM orders_db.orders;"
```

### Conectarse a MySQL Interactivo
```bash
# Products DB
docker exec -it mysql-products mysql -uroot -proot products_db

# Orders DB
docker exec -it mysql-orders mysql -uroot -proot orders_db
```

## 🐳 Docker

### Ver Contenedores
```bash
docker ps                    # Running
docker ps -a                 # Todos
docker-compose ps           # Solo docker-compose
```

### Logs
```bash
docker-compose logs -f                # Todos
docker-compose logs -f rabbitmq       # RabbitMQ
docker-compose logs -f mysql-products # MySQL Products
docker-compose logs -f mysql-orders   # MySQL Orders
```

### Reiniciar Contenedor
```bash
docker-compose restart rabbitmq
docker-compose restart mysql-products
docker-compose restart mysql-orders
```

### Estado de Recursos
```bash
docker stats                 # Uso de CPU/RAM
docker-compose top          # Procesos
```

## 📊 RabbitMQ

### Management UI
```
http://localhost:15672
Usuario: guest
Contraseña: guest
```

### CLI
```bash
# Ver colas
docker exec rabbitmq rabbitmqctl list_queues

# Ver exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# Ver bindings
docker exec rabbitmq rabbitmqctl list_bindings
```

## 🔍 Debugging

### Ver Logs de Servicios
```bash
# Backend (Terminal donde ejecutaste npm run start:all)
# Los logs aparecen en la terminal

# MCP Server
# Logs en Terminal 2

# AI Gateway
# Logs en Terminal 3
```

### Verificar Puertos en Uso
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5672

# Linux/Mac
lsof -ti:3000
lsof -ti:3001
lsof -ti:5672
```

### Matar Proceso por Puerto
```bash
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

## 📝 NPM Scripts

```bash
npm run start:all           # Backend completo
npm run start:gateway       # Solo API Gateway
npm run start:orders        # Solo Orders Service
npm run start:products      # Solo Products Service
npm run start:mcp           # MCP Server
npm run start:ai            # AI Gateway
npm run start:all:ai        # Todo junto
npm run build               # Compilar TypeScript
```

## 🔧 Configuración

### Editar API Key de Gemini
```bash
# Windows
notepad apps/api-gateway-ai/.env

# Linux/Mac
nano apps/api-gateway-ai/.env
```

### Variables de Entorno
```env
# AI Gateway (.env)
GEMINI_API_KEY=tu-api-key
MCP_SERVER_URL=http://localhost:3001

# Docker (docker-compose.yml)
MYSQL_ROOT_PASSWORD=root
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
```

## 📚 Documentación Rápida

```bash
# Ver documentos principales
cat README.md
cat INICIO-RAPIDO.md
cat GUIA-USUARIO-FINAL.md

# Abrir en navegador
start README.md              # Windows
open README.md               # Mac
xdg-open README.md          # Linux
```

## 🧹 Limpieza

### Eliminar node_modules
```bash
rm -rf node_modules
rm -rf apps/mcp-server/node_modules
rm -rf apps/api-gateway-ai/node_modules
rm -rf apps/*/node_modules
```

### Reinstalar Todo
```bash
npm install
cd apps/mcp-server && npm install && cd ../..
cd apps/api-gateway-ai && npm install && cd ../..
```

### Limpiar Docker
```bash
docker-compose down -v       # Eliminar volúmenes
docker system prune -a       # Limpiar todo (CUIDADO)
```

## 💬 Consultas IA Comunes

### Productos
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué productos tienen?"}'

curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuánto cuesta la laptop?"}'
```

### Stock
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Hay stock de 10 laptops?"}'
```

### Pedidos
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "Quiero comprar 3 laptops"}'
```

### Operaciones Complejas
```bash
curl -X POST http://localhost:3000/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "Si hay más de 10 laptops, créame un pedido de 5"}'
```

## 🔍 Troubleshooting Rápido

### Error: ECONNREFUSED localhost:3001
```bash
# MCP Server no está corriendo
npm run start:mcp
```

### Error: Invalid API Key
```bash
# Verificar .env
notepad apps/api-gateway-ai/.env
# Obtener nueva key: https://aistudio.google.com
```

### Error: Port already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Error: Cannot connect to MySQL
```bash
# Esperar a que contenedores estén listos
docker-compose ps
# Debe mostrar "Up" en todos los servicios

# Si no, reiniciar
docker-compose restart mysql-products
docker-compose restart mysql-orders
```

### Error: RabbitMQ connection refused
```bash
# Verificar RabbitMQ
docker-compose ps rabbitmq
docker-compose logs rabbitmq

# Reiniciar si es necesario
docker-compose restart rabbitmq
```

## 📊 Monitoreo

### Health Checks
```bash
# AI Gateway
curl http://localhost:3000/ai/health

# MCP Server
curl http://localhost:3001/health

# Backend (API Gateway original)
curl http://localhost:3000/health  # Si existe
```

### Estado General
```bash
docker ps                           # Contenedores
docker stats                        # Recursos
docker-compose logs -f --tail=50   # Últimos 50 logs
```

## 🎓 Atajos PowerShell

```powershell
# Función para iniciar todo
function Start-AllServices {
    docker-compose up -d
    Start-Sleep -Seconds 30
    Start-Process powershell -ArgumentList "npm run start:all"
    Start-Process powershell -ArgumentList "npm run start:mcp"
    Start-Process powershell -ArgumentList "npm run start:ai"
}

# Función para detener todo
function Stop-AllServices {
    docker-compose down
}

# Función para reiniciar limpio
function Reset-AllServices {
    docker-compose down -v
    docker-compose up -d
    Start-Sleep -Seconds 30
    ./insert-test-data.ps1
}

# Usar:
# Start-AllServices
# Stop-AllServices
# Reset-AllServices
```

## 🚀 Workflow Típico

### Desarrollo Diario
```bash
# 1. Iniciar infraestructura
docker-compose up -d

# 2. Iniciar servicios
npm run start:all:ai

# 3. Probar cambios
./test-end-to-end.ps1

# 4. Verificar BD si es necesario
docker exec -it mysql-products mysql -uroot -proot \
  -e "SELECT * FROM products_db.products;"

# 5. Detener al final del día
docker-compose down
```

### Testing Completo
```bash
# 1. Reiniciar limpio
docker-compose down -v && docker-compose up -d
Start-Sleep -Seconds 30

# 2. Insertar datos
./insert-test-data.ps1

# 3. Iniciar servicios
npm run start:all:ai

# 4. Ejecutar todos los tests
./test-end-to-end.ps1
./test-mcp-server.ps1
./test-ai-gateway.ps1
```

## 📞 Links Útiles

```
RabbitMQ Management:  http://localhost:15672
Supabase (opcional):  https://supabase.com
Gemini API Keys:      https://aistudio.google.com
```

## 🎯 Comandos Más Usados (Top 10)

1. `npm run start:all:ai` - Iniciar todo
2. `docker-compose up -d` - Infraestructura
3. `./test-end-to-end.ps1` - Pruebas completas
4. `./insert-test-data.ps1` - Datos de prueba
5. `docker-compose down` - Detener infraestructura
6. `curl http://localhost:3000/ai/ask ...` - Consulta IA
7. `docker exec -it mysql-products ...` - Ver productos
8. `docker-compose logs -f` - Ver logs
9. `docker ps` - Estado contenedores
10. `curl http://localhost:3000/ai/health` - Health check

---

**💡 TIP:** Guarda esta referencia para acceso rápido durante el desarrollo.

**📚 Más info:** [INDEX.md](./INDEX.md) | [INICIO-RAPIDO.md](./INICIO-RAPIDO.md)
