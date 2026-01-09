/**
 * Tool: validar_stock
 * Valida si hay stock suficiente para un producto
 */
import { MCPTool, ToolExecutionParams, ToolExecutionResult } from '../types';
import { backendClient } from '../services/backend-client';

export const validarStockTool: MCPTool = {
  name: 'validar_stock',
  description: 'Valida si hay stock suficiente de un producto para realizar un pedido. Retorna disponibilidad y cantidad disponible.',
  inputSchema: {
    type: 'object',
    properties: {
      productId: {
        type: 'number',
        description: 'ID del producto a validar',
      },
      cantidad: {
        type: 'number',
        description: 'Cantidad de unidades requeridas',
      },
    },
    required: ['productId', 'cantidad'],
  },
};

export async function executeValidarStock(params: ToolExecutionParams): Promise<ToolExecutionResult> {
  try {
    const { productId, cantidad } = params;

    // Validar parámetros
    if (!productId || !cantidad) {
      return {
        success: false,
        error: 'Debe proporcionar productId y cantidad',
      };
    }

    if (cantidad <= 0) {
      return {
        success: false,
        error: 'La cantidad debe ser mayor a 0',
      };
    }

    // Buscar el producto
    const product = await backendClient.getProductById(Number(productId));

    if (!product) {
      return {
        success: false,
        error: `No se encontró el producto con ID ${productId}`,
      };
    }

    // Validar stock
    const stockSuficiente = product.stock >= cantidad;
    const stockDisponible = product.stock;
    const faltante = stockSuficiente ? 0 : cantidad - product.stock;

    if (stockSuficiente) {
      return {
        success: true,
        data: {
          producto: product.name,
          productId: product.id,
          stockDisponible,
          cantidadRequerida: cantidad,
          disponible: true,
        },
        message: `✅ Stock disponible: ${product.name} tiene ${stockDisponible} unidades. Se pueden reservar ${cantidad} unidades.`,
      };
    } else {
      return {
        success: false,
        data: {
          producto: product.name,
          productId: product.id,
          stockDisponible,
          cantidadRequerida: cantidad,
          faltante,
          disponible: false,
        },
        error: `❌ Stock insuficiente: ${product.name} solo tiene ${stockDisponible} unidades disponibles. Faltan ${faltante} unidades para completar el pedido de ${cantidad}.`,
      };
    }

  } catch (error: any) {
    console.error('[validar_stock] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al validar el stock',
    };
  }
}
