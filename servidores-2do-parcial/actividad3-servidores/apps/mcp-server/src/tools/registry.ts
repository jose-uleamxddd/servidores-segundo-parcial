/**
 * Registro de Tools MCP
 * Centraliza todos los tools disponibles en el servidor
 */
import { MCPTool, ToolExecutionParams, ToolExecutionResult } from '../types';
import { buscarProductoTool, executeBuscarProducto } from './buscar-producto.tool';
import { validarStockTool, executeValidarStock } from './validar-stock.tool';
import { crearPedidoTool, executeCrearPedido } from './crear-pedido.tool';
import { listarInventarioTool, executeListarInventario } from './listar-inventario.tool';

// Registro de tools disponibles
export const tools: MCPTool[] = [
  listarInventarioTool,
  buscarProductoTool,
  validarStockTool,
  crearPedidoTool,
];

// Mapa de funciones de ejecución
const executors: Record<string, (params: ToolExecutionParams) => Promise<ToolExecutionResult>> = {
  'listar_inventario': executeListarInventario,
  'buscar_producto': executeBuscarProducto,
  'validar_stock': executeValidarStock,
  'crear_pedido': executeCrearPedido,
};

/**
 * Obtiene todos los tools disponibles
 */
export function getAvailableTools(): MCPTool[] {
  return tools;
}

/**
 * Obtiene un tool específico por nombre
 */
export function getToolByName(name: string): MCPTool | undefined {
  return tools.find(tool => tool.name === name);
}

/**
 * Ejecuta un tool con los parámetros dados
 */
export async function executeTool(
  toolName: string,
  params: ToolExecutionParams
): Promise<ToolExecutionResult> {
  const executor = executors[toolName];
  
  if (!executor) {
    return {
      success: false,
      error: `Tool '${toolName}' no encontrado. Tools disponibles: ${Object.keys(executors).join(', ')}`,
    };
  }

  try {
    console.log(`[Registry] Ejecutando tool: ${toolName}`);
    console.log(`[Registry] Parámetros:`, JSON.stringify(params, null, 2));
    
    const result = await executor(params);
    
    console.log(`[Registry] Resultado: ${result.success ? 'Éxito' : 'Error'}`);
    
    return result;
  } catch (error: any) {
    console.error(`[Registry] Error ejecutando ${toolName}:`, error);
    return {
      success: false,
      error: error.message || 'Error inesperado al ejecutar el tool',
    };
  }
}

/**
 * Valida que un tool tenga todos los parámetros requeridos
 */
export function validateToolParams(toolName: string, params: ToolExecutionParams): { valid: boolean; error?: string } {
  const tool = getToolByName(toolName);
  
  if (!tool) {
    return { valid: false, error: `Tool '${toolName}' no encontrado` };
  }

  const required = tool.inputSchema.required || [];
  const missing = required.filter(param => !(param in params));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Parámetros requeridos faltantes: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}
