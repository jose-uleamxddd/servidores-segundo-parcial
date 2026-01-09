/**
 * MCP Server - JSON-RPC 2.0
 * Servidor que expone Tools mediante el protocolo JSON-RPC
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jayson from 'jayson';
import { getAvailableTools, executeTool, validateToolParams } from './tools/registry';
import { backendClient } from './services/backend-client';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ========================================
// MÉTODOS JSON-RPC
// ========================================

const rpcMethods = {
  /**
   * Listar todos los tools disponibles
   */
  'tools/list': async function (args: any, callback: any) {
    try {
      console.log('[RPC] tools/list - Listando tools disponibles');
      const tools = getAvailableTools();
      
      callback(null, {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
        total: tools.length,
      });
    } catch (error: any) {
      console.error('[RPC] Error en tools/list:', error);
      callback({
        code: -32603,
        message: 'Internal error',
        data: error.message,
      });
    }
  },

  /**
   * Ejecutar un tool específico
   */
  'tools/call': async function (args: any, callback: any) {
    try {
      const { name, arguments: params } = args;

      console.log(`[RPC] tools/call - Ejecutando tool: ${name}`);
      console.log(`[RPC] Parámetros recibidos:`, JSON.stringify(params, null, 2));

      // Validar que se proporcione el nombre del tool
      if (!name) {
        return callback({
          code: -32602,
          message: 'Invalid params',
          data: 'El parámetro "name" es requerido',
        });
      }

      // Validar parámetros del tool
      const validation = validateToolParams(name, params || {});
      if (!validation.valid) {
        return callback({
          code: -32602,
          message: 'Invalid params',
          data: validation.error,
        });
      }

      // Ejecutar el tool
      const result = await executeTool(name, params || {});

      // Retornar resultado
      callback(null, {
        content: [
          {
            type: 'text',
            text: result.message || (result.success ? 'Operación exitosa' : result.error),
          },
        ],
        isError: !result.success,
        _meta: {
          success: result.success,
          data: result.data,
          error: result.error,
        },
      });

    } catch (error: any) {
      console.error('[RPC] Error en tools/call:', error);
      callback({
        code: -32603,
        message: 'Internal error',
        data: error.message,
      });
    }
  },

  /**
   * Verificar salud del servidor
   */
  'ping': async function (args: any, callback: any) {
    try {
      const backendHealthy = await backendClient.healthCheck();
      
      callback(null, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        backend: backendHealthy ? 'connected' : 'disconnected',
        tools: getAvailableTools().length,
      });
    } catch (error: any) {
      callback({
        code: -32603,
        message: 'Internal error',
        data: error.message,
      });
    }
  },
};

// Crear servidor JSON-RPC
const rpcServer = jayson.Server(rpcMethods);

// ========================================
// RUTAS HTTP
// ========================================

/**
 * Endpoint principal JSON-RPC
 */
app.post('/rpc', (req: Request, res: Response) => {
  console.log('[HTTP] POST /rpc - Solicitud JSON-RPC recibida');
  rpcServer.call(req.body, (error: any, response: any) => {
    if (error) {
      console.error('[HTTP] Error en RPC:', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        error: error,
        id: req.body.id || null,
      });
    }
    res.json(response);
  });
});

/**
 * Health check HTTP simple
 */
app.get('/health', async (req: Request, res: Response) => {
  const backendHealthy = await backendClient.healthCheck();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'mcp-server',
    version: '1.0.0',
    backend: {
      url: process.env.BACKEND_URL,
      healthy: backendHealthy,
    },
    tools: {
      available: getAvailableTools().length,
      list: getAvailableTools().map(t => t.name),
    },
  });
});

/**
 * Listar tools disponibles (HTTP GET)
 */
app.get('/tools', (req: Request, res: Response) => {
  const tools = getAvailableTools();
  res.json({
    tools: tools,
    total: tools.length,
  });
});

/**
 * Información del servidor
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'MCP Server - Sistema de Pedidos',
    version: '1.0.0',
    protocol: 'JSON-RPC 2.0',
    endpoints: {
      rpc: 'POST /rpc',
      health: 'GET /health',
      tools: 'GET /tools',
    },
    documentation: 'https://modelcontextprotocol.io',
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

async function startServer() {
  try {
    // Verificar conexión con backend
    console.log('[Startup] Verificando conexión con backend...');
    const backendHealthy = await backendClient.healthCheck();
    
    if (!backendHealthy) {
      console.warn('[Startup] ⚠️  Backend no disponible en', process.env.BACKEND_URL);
      console.warn('[Startup] El servidor MCP iniciará de todas formas, pero los tools fallarán.');
    } else {
      console.log('[Startup] ✅ Backend conectado correctamente');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 MCP SERVER INICIADO');
      console.log('='.repeat(60));
      console.log(`Puerto: ${PORT}`);
      console.log(`Backend URL: ${process.env.BACKEND_URL}`);
      console.log(`Tools disponibles: ${getAvailableTools().length}`);
      console.log('\nTools:');
      getAvailableTools().forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name} - ${tool.description}`);
      });
      console.log('\nEndpoints:');
      console.log(`  - JSON-RPC: http://localhost:${PORT}/rpc`);
      console.log(`  - Health:   http://localhost:${PORT}/health`);
      console.log(`  - Tools:    http://localhost:${PORT}/tools`);
      console.log('='.repeat(60) + '\n');
    });

  } catch (error) {
    console.error('[Startup] Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Error] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Error] Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar
startServer();
