/**
 * Tool: crear_pedido
 * Crea un nuevo pedido de producto
 */
import { MCPTool, ToolExecutionParams, ToolExecutionResult } from '../types';
import { backendClient } from '../services/backend-client';

export const crearPedidoTool: MCPTool = {
  name: 'crear_pedido',
  description: 'Crea un nuevo pedido de producto. El sistema validará automáticamente el stock y procesará el pedido de forma asíncrona.',
  inputSchema: {
    type: 'object',
    properties: {
      productId: {
        type: 'number',
        description: 'ID del producto a pedir',
      },
      cantidad: {
        type: 'number',
        description: 'Cantidad de unidades a pedir',
      },
      cliente: {
        type: 'string',
        description: 'Nombre del cliente que realiza el pedido (opcional)',
      },
    },
    required: ['productId', 'cantidad'],
  },
};

export async function executeCrearPedido(params: ToolExecutionParams): Promise<ToolExecutionResult> {
  try {
    const { productId, cantidad, cliente } = params;

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

    // Primero verificar que el producto existe
    const product = await backendClient.getProductById(Number(productId));
    
    if (!product) {
      return {
        success: false,
        error: `No se encontró el producto con ID ${productId}`,
      };
    }

    // Crear el pedido
    const order = await backendClient.createOrder(Number(productId), Number(cantidad));

    // Preparar mensaje de respuesta
    let mensaje = `📦 Pedido creado exitosamente:\n`;
    mensaje += `- ID Pedido: ${order.id}\n`;
    mensaje += `- Producto: ${product.name}\n`;
    mensaje += `- Cantidad: ${cantidad} unidades\n`;
    mensaje += `- Estado: ${order.status}\n`;
    
    if (cliente) {
      mensaje += `- Cliente: ${cliente}\n`;
    }

    // Agregar información adicional según el estado
    if (order.status === 'PENDING') {
      mensaje += `\n⏳ El pedido está siendo procesado. Se validará el stock automáticamente.`;
    } else if (order.status === 'CONFIRMED') {
      mensaje += `\n✅ El pedido ha sido confirmado. El stock ha sido reservado.`;
    } else if (order.status === 'REJECTED') {
      mensaje += `\n❌ El pedido fue rechazado. Razón: ${order.reason}`;
    }

    return {
      success: true,
      data: {
        pedido: order,
        producto: product,
        cliente: cliente || 'No especificado',
      },
      message: mensaje,
    };

  } catch (error: any) {
    console.error('[crear_pedido] Error:', error);
    
    // Extraer mensaje de error más específico
    let errorMessage = 'Error al crear el pedido';
    
    if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
