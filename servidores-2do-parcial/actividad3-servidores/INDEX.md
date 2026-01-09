# 📚 Índice General del Proyecto

Este documento sirve como **guía de navegación** para toda la documentación del proyecto.

## 🚀 Inicio Rápido

**¿Primera vez usando el sistema?** Empieza aquí:

1. **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** - De 0 a sistema funcionando en 10 minutos
2. **[README.md](./README.md)** - Visión general del proyecto
3. **[SISTEMA-COMPLETO.md](./SISTEMA-COMPLETO.md)** - Resumen ejecutivo completo

## 📖 Documentación para Usuarios

### Guías de Uso
- **[GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)** - 40+ ejemplos de uso con IA
  - Preguntas que puedes hacer
  - Operaciones simples y complejas
  - Ejemplos de conversaciones
  
### Ejecución y Configuración
- **[EJECUCION.md](./EJECUCION.md)** - Cómo ejecutar el sistema
  - Comandos de inicio
  - Variables de entorno
  - Configuración de servicios

## 🏗️ Documentación Técnica

### Arquitectura
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagramas y componentes
  - Diagrama de arquitectura
  - Flujo de datos
  - Tecnologías utilizadas

- **[DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md)** - Detalles técnicos profundos
  - APIs completas
  - Estructura de código
  - Configuraciones avanzadas

- **[DOCUMENTACION-COMPLETA-DEL-PROYECTO.md](./DOCUMENTACION-COMPLETA-DEL-PROYECTO.md)** - Documentación del sistema base
  - Microservicios originales
  - Webhooks
  - RabbitMQ

### Flujos del Sistema
- **[FLUJO-COMPLETO-DEL-SISTEMA.md](./FLUJO-COMPLETO-DEL-SISTEMA.md)** - Flujos de negocio
  - Crear pedido
  - Reservar stock
  - Webhooks

- **[IDEMPOTENCIA-MYSQL.md](./IDEMPOTENCIA-MYSQL.md)** - Implementación de idempotencia
  - Eventos procesados
  - Prevención de duplicados

## 🤖 Documentación MCP + IA

### Implementación por Fases
- **[PASO-1-MCP-SERVER-COMPLETADO.md](./PASO-1-MCP-SERVER-COMPLETADO.md)** - MCP Server
  - JSON-RPC 2.0
  - Herramientas implementadas
  - Testing

- **[PASO-2-AI-GATEWAY-COMPLETADO.md](./PASO-2-AI-GATEWAY-COMPLETADO.md)** - AI Gateway con Gemini
  - Function Calling
  - Integración Gemini
  - Orquestación

- **[PASO-3-FINAL-COMPLETADO.md](./PASO-3-FINAL-COMPLETADO.md)** - Testing y optimización
  - Suite de pruebas
  - Documentación final
  - Métricas

### READMEs de Componentes
- **[apps/mcp-server/README.md](./apps/mcp-server/README.md)** - Documentación del MCP Server
- **[apps/api-gateway-ai/README.md](./apps/api-gateway-ai/README.md)** - Documentación del AI Gateway

## 🧪 Pruebas y Verificación

### Guías de Testing
- **[GUIA-PRUEBAS.md](./GUIA-PRUEBAS.md)** - Manual de pruebas
  - Pruebas manuales
  - Verificación de componentes
  - Casos de prueba

- **[VERIFICACION-MYSQL.md](./VERIFICACION-MYSQL.md)** - Queries de verificación
  - Consultas útiles
  - Verificación de datos
  - Troubleshooting de BD

### Scripts de Prueba

#### Inserción de Datos
- **[insert-test-data.ps1](./insert-test-data.ps1)** - Insertar 10 productos de prueba
  ```bash
  ./insert-test-data.ps1
  ```

#### Tests del MCP Server
- **[test-mcp-server.ps1](./test-mcp-server.ps1)** - 10 tests del JSON-RPC Server
  ```bash
  ./test-mcp-server.ps1
  ```

#### Tests del AI Gateway
- **[test-ai-gateway.ps1](./test-ai-gateway.ps1)** - 10 tests con Gemini
  ```bash
  ./test-ai-gateway.ps1
  ```

#### Tests End-to-End
- **[test-end-to-end.ps1](./test-end-to-end.ps1)** - 12 tests completos
  ```bash
  ./test-end-to-end.ps1
  ```

#### Tests del Sistema Base
- **[test-order.ps1](./test-order.ps1)** - Crear pedidos
- **[test-idempotencia.ps1](./test-idempotencia.ps1)** - Verificar idempotencia
- **[test-idempotency.ps1](./test-idempotency.ps1)** - Tests detallados
- **[test-idempotency-detailed.ps1](./test-idempotency-detailed.ps1)** - Tests exhaustivos
- **[test-multiples-pedidos.ps1](./test-multiples-pedidos.ps1)** - Múltiples pedidos
- **[test-webhooks.ps1](./test-webhooks.ps1)** - Verificar webhooks
- **[test-webhook-deliveries.ps1](./test-webhook-deliveries.ps1)** - Entregas de webhooks
- **[test-retry-backoff.ps1](./test-retry-backoff.ps1)** - Reintentos
- **[test-invalid-signature.ps1](./test-invalid-signature.ps1)** - Firmas inválidas

## 📋 Otros Documentos

- **[TALLER2-README.md](./TALLER2-README.md)** - README del taller base
- **[check-status.ps1](./check-status.ps1)** - Script de verificación de estado
- **[gateway-log.txt](./gateway-log.txt)** - Logs del gateway

## 🗺️ Mapa de Navegación por Rol

### Soy Desarrollador Backend
1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Entender la arquitectura
2. **[DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md)** - APIs y código
3. **[PASO-1-MCP-SERVER-COMPLETADO.md](./PASO-1-MCP-SERVER-COMPLETADO.md)** - Implementación MCP
4. **[apps/mcp-server/README.md](./apps/mcp-server/README.md)** - Detalles del MCP Server

### Soy Desarrollador de IA/ML
1. **[PASO-2-AI-GATEWAY-COMPLETADO.md](./PASO-2-AI-GATEWAY-COMPLETADO.md)** - Gateway con Gemini
2. **[apps/api-gateway-ai/README.md](./apps/api-gateway-ai/README.md)** - Detalles del AI Gateway
3. **[GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)** - Ejemplos de uso
4. **[test-ai-gateway.ps1](./test-ai-gateway.ps1)** - Pruebas

### Soy Tester/QA
1. **[GUIA-PRUEBAS.md](./GUIA-PRUEBAS.md)** - Manual de pruebas
2. **[test-end-to-end.ps1](./test-end-to-end.ps1)** - Suite completa
3. **[test-mcp-server.ps1](./test-mcp-server.ps1)** - Tests MCP
4. **[test-ai-gateway.ps1](./test-ai-gateway.ps1)** - Tests IA
5. **[VERIFICACION-MYSQL.md](./VERIFICACION-MYSQL.md)** - Verificar BD

### Soy DevOps/SRE
1. **[EJECUCION.md](./EJECUCION.md)** - Despliegue
2. **[docker-compose.yml](./docker-compose.yml)** - Configuración Docker
3. **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** - Setup rápido
4. **[check-status.ps1](./check-status.ps1)** - Monitoreo

### Soy Usuario Final
1. **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** - Instalación en 10 minutos
2. **[GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)** - Cómo usar el sistema
3. **[README.md](./README.md)** - Visión general

### Soy Estudiante/Aprendiz
1. **[SISTEMA-COMPLETO.md](./SISTEMA-COMPLETO.md)** - Resumen ejecutivo
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura
3. **[FLUJO-COMPLETO-DEL-SISTEMA.md](./FLUJO-COMPLETO-DEL-SISTEMA.md)** - Flujos
4. **[DOCUMENTACION-COMPLETA-DEL-PROYECTO.md](./DOCUMENTACION-COMPLETA-DEL-PROYECTO.md)** - Sistema base
5. **[PASO-1-MCP-SERVER-COMPLETADO.md](./PASO-1-MCP-SERVER-COMPLETADO.md)** - MCP
6. **[PASO-2-AI-GATEWAY-COMPLETADO.md](./PASO-2-AI-GATEWAY-COMPLETADO.md)** - IA
7. **[PASO-3-FINAL-COMPLETADO.md](./PASO-3-FINAL-COMPLETADO.md)** - Testing

## 🎯 Búsqueda Rápida

### ¿Necesitas...?

#### Instalar el sistema
→ **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)**

#### Entender la arquitectura
→ **[ARCHITECTURE.md](./ARCHITECTURE.md)**

#### Ejemplos de uso
→ **[GUIA-USUARIO-FINAL.md](./GUIA-USUARIO-FINAL.md)**

#### Probar el sistema
→ **[test-end-to-end.ps1](./test-end-to-end.ps1)**

#### Documentación técnica
→ **[DOCUMENTACION-TECNICA-COMPLETA.md](./DOCUMENTACION-TECNICA-COMPLETA.md)**

#### Configurar Gemini
→ **[PASO-2-AI-GATEWAY-COMPLETADO.md](./PASO-2-AI-GATEWAY-COMPLETADO.md)** (sección "Configurar API Key")

#### Entender MCP
→ **[PASO-1-MCP-SERVER-COMPLETADO.md](./PASO-1-MCP-SERVER-COMPLETADO.md)**

#### Troubleshooting
→ **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** (sección "Troubleshooting")

#### Verificar base de datos
→ **[VERIFICACION-MYSQL.md](./VERIFICACION-MYSQL.md)**

#### Comandos útiles
→ **[EJECUCION.md](./EJECUCION.md)**

## 📊 Estadísticas de Documentación

- **Total de documentos:** 18 archivos .md
- **Scripts de prueba:** 12 archivos .ps1
- **Líneas de documentación:** ~15,000
- **Ejemplos de código:** ~500
- **Diagramas:** 10+
- **Tests automatizados:** 32 pruebas

## 🔄 Actualización

Este índice se actualiza con cada nueva versión del proyecto.

**Última actualización:** 2024
**Versión:** 1.0.0

---

## 💡 Tips de Navegación

1. **Ctrl + F** para buscar en este documento
2. Los links son clicables en VS Code
3. Usa el outline (Ctrl + Shift + O) para navegar secciones
4. Guarda este INDEX.md en favoritos

## 🆘 ¿Necesitas Ayuda?

Si no encuentras lo que buscas:
1. Revisa la sección "Búsqueda Rápida"
2. Consulta "Mapa de Navegación por Rol"
3. Revisa **[SISTEMA-COMPLETO.md](./SISTEMA-COMPLETO.md)** para un resumen ejecutivo

---

**Happy Coding! 🚀**
