/**
 * Tool: buscar_producto
 * Permite buscar productos por ID o nombre
 */
import { MCPTool, ToolExecutionParams, ToolExecutionResult } from '../types';
import { backendClient } from '../services/backend-client';

export const buscarProductoTool: MCPTool = {
  name: 'buscar_producto',
  description: 'Busca productos por nombre o ID. Usa este tool cuando el usuario pregunte por productos, laptops, teléfonos, etc. Realiza búsquedas flexibles encontrando productos que contengan la palabra buscada. Retorna información completa incluyendo stock, precio y detalles. IMPORTANTE: Para buscar laptops usa nombre="Laptop", para teléfonos usa nombre="Phone", etc.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'ID numérico del producto a buscar',
      },
      nombre: {
        type: 'string',
        description: 'Nombre del producto a buscar (búsqueda parcial, encuentra productos que contengan esta palabra). Ejemplos: "Laptop", "Phone", "Mouse", etc.',
      },
    },
    // Al menos uno de los dos parámetros debe estar presente
  },
};

export async function executeBuscarProducto(params: ToolExecutionParams): Promise<ToolExecutionResult> {
  try {
    const { id, nombre } = params;

    // Validar que al menos un parámetro esté presente
    if (!id && !nombre) {
      return {
        success: false,
        error: 'Debe proporcionar al menos un parámetro: id o nombre',
      };
    }

    // Buscar por ID
    if (id) {
      const product = await backendClient.getProductById(Number(id));
      
      if (!product) {
        return {
          success: false,
          error: `No se encontró el producto con ID ${id}`,
        };
      }

      return {
        success: true,
        data: product,
        message: `Producto encontrado: ${product.name} - Stock: ${product.stock} unidades - Precio: $${product.price}`,
      };
    }

    // Buscar por nombre
    if (nombre) {
      const products = await backendClient.searchProductsByName(nombre);
      
      if (products.length === 0) {
        return {
          success: false,
          error: `No se encontraron productos con el nombre "${nombre}"`,
        };
      }

      return {
        success: true,
        data: products,
        message: `Se encontraron ${products.length} producto(s) que coinciden con "${nombre}"`,
      };
    }

    return {
      success: false,
      error: 'Error inesperado en la búsqueda',
    };

  } catch (error: any) {
    console.error('[buscar_producto] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al buscar el producto',
    };
  }
}
