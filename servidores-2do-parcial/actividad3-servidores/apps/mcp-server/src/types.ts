/**
 * Tipos TypeScript para el MCP Server
 */

// Estructura de un Tool MCP
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Parámetros de ejecución de un Tool
export interface ToolExecutionParams {
  [key: string]: any;
}

// Resultado de ejecución de un Tool
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Producto
export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

// Pedido
export interface Order {
  id: number;
  productId: number;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

// Request JSON-RPC 2.0
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

// Response JSON-RPC 2.0
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}
