/**
 * Tool: listar_inventario
 * Permite listar todos los productos disponibles en el inventario
 */
import { MCPTool, ToolExecutionParams, ToolExecutionResult } from '../types';
import { backendClient } from '../services/backend-client';

export const listarInventarioTool: MCPTool = {
  name: 'listar_inventario',
  description: 'Lista todos los productos disponibles en el inventario. Usa este tool cuando el usuario pregunte "qué productos tienes", "muéstrame todo", "qué vendes", etc. Retorna la lista completa con ID, nombre, precio y stock de cada producto.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function executeListarInventario(params: ToolExecutionParams): Promise<ToolExecutionResult> {
  try {
    const products = await backendClient.getAllProducts();
    
    if (products.length === 0) {
      return {
        success: false,
        error: 'No hay productos en el inventario',
      };
    }

    return {
      success: true,
      data: products,
      message: `Se encontraron ${products.length} productos en el inventario`,
    };

  } catch (error: any) {
    console.error('[listar_inventario] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al listar el inventario',
    };
  }
}
