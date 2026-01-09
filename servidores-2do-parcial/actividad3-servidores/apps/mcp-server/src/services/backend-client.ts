/**
 * Cliente para comunicación con el backend de microservicios
 */
import axios, { AxiosInstance } from 'axios';
import { Product, Order } from '../types';

export class BackendClient {
  private client: AxiosInstance;

  constructor(private baseURL: string = process.env.BACKEND_URL || 'http://localhost:3000') {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      console.log(`[BackendClient] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[BackendClient] Response: ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`[BackendClient] Error: ${error.message}`);
        throw error;
      }
    );
  }

  /**
   * Buscar producto por ID
   */
  async getProductById(id: number): Promise<Product | null> {
    try {
      const response = await this.client.get(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Buscar productos por nombre (búsqueda parcial)
   */
  async searchProductsByName(name: string): Promise<Product[]> {
    try {
      const response = await this.client.get('/products/search', {
        params: { name },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Obtener todos los productos
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await this.client.get('/products');
      return response.data;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  /**
   * Crear un nuevo pedido
   */
  async createOrder(productId: number, quantity: number): Promise<Order> {
    try {
      const response = await this.client.post('/orders', {
        productId,
        quantity,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new Error(error.response?.data?.message || 'Error creating order');
    }
  }

  /**
   * Obtener pedido por ID
   */
  async getOrderById(id: number): Promise<Order | null> {
    try {
      const response = await this.client.get(`/orders/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verificar salud del backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton
export const backendClient = new BackendClient();
