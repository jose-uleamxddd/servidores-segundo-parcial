/**
 * Cliente MCP - Comunicación con el MCP Server
 */
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError: boolean;
  _meta?: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);
  private client: AxiosInstance;
  private requestId = 0;

  constructor() {
    const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.client = axios.create({
      baseURL: mcpUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`MCP Client configurado: ${mcpUrl}`);
  }

  /**
   * Obtiene todos los tools disponibles del MCP Server
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    try {
      this.logger.log('Obteniendo tools disponibles del MCP Server...');
      
      const response = await this.client.post('/rpc', {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: ++this.requestId,
      });

      const tools = response.data.result.tools;
      this.logger.log(`Tools obtenidos: ${tools.length}`);
      
      return tools;
    } catch (error: any) {
      this.logger.error('Error obteniendo tools:', error.message);
      throw new Error(`No se pudo conectar con el MCP Server: ${error.message}`);
    }
  }

  /**
   * Ejecuta un tool específico
   */
  async callTool(toolName: string, args: any): Promise<MCPToolResult> {
    try {
      this.logger.log(`Ejecutando tool: ${toolName}`);
      this.logger.debug(`Argumentos: ${JSON.stringify(args)}`);

      const response = await this.client.post('/rpc', {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        id: ++this.requestId,
      });

      if (response.data.error) {
        this.logger.error(`Error en tool ${toolName}:`, response.data.error);
        return {
          content: [{
            type: 'text',
            text: response.data.error.message || 'Error desconocido',
          }],
          isError: true,
        };
      }

      const result = response.data.result;
      this.logger.log(`Tool ${toolName} ejecutado: ${result.isError ? 'Error' : 'Éxito'}`);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Error ejecutando tool ${toolName}:`, error.message);
      return {
        content: [{
          type: 'text',
          text: `Error ejecutando ${toolName}: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Verifica la salud del MCP Server
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.post('/rpc', {
        jsonrpc: '2.0',
        method: 'ping',
        id: ++this.requestId,
      });

      return response.data.result?.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}
