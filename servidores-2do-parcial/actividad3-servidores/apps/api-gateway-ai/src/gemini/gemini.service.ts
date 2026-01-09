/**
 * Servicio de Gemini AI con Function Calling
 */
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { McpClientService, MCPTool } from '../mcp-client/mcp-client.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private mcpClient: McpClientService) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.log('✅ Gemini AI inicializado correctamente');
  }

  /**
   * Convierte un MCP Tool al formato de Gemini Function Declaration
   */
  private convertMCPToolToGeminiFunction(tool: MCPTool) {
    const parameters: any = {
      type: 'OBJECT',
      properties: {},
      required: tool.inputSchema.required || [],
    };

    // Convertir propiedades
    for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
      const prop: any = value;
      parameters.properties[key] = {
        type: this.mapTypeToGemini(prop.type),
        description: prop.description || '',
      };
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters,
    };
  }

  /**
   * Mapea tipos de JSON Schema a tipos de Gemini
   */
  private mapTypeToGemini(type: string): string {
    const mapping: Record<string, string> = {
      'string': 'STRING',
      'number': 'NUMBER',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'array': 'ARRAY',
      'object': 'OBJECT',
    };
    return mapping[type] || 'STRING';
  }

  /**
   * Procesa un mensaje del usuario usando Gemini con Function Calling
   */
  async processMessage(userMessage: string): Promise<string> {
    try {
      this.logger.log(`📨 Procesando mensaje: "${userMessage}"`);

      // 1. Obtener tools disponibles del MCP Server
      const mcpTools = await this.mcpClient.getAvailableTools();
      this.logger.log(`🔧 Tools disponibles: ${mcpTools.length}`);

      // 2. Convertir tools a formato Gemini
      const geminiFunctions = mcpTools.map(tool => 
        this.convertMCPToolToGeminiFunction(tool)
      );

      // 3. Configurar modelo con las funciones e instrucciones del sistema
      const systemInstruction = `Eres un asistente de compras inteligente. Ayudas a los usuarios a encontrar productos y realizar pedidos.

HERRAMIENTAS DISPONIBLES:
1. listar_inventario() - Muestra TODOS los productos del inventario. Úsala cuando el usuario pregunte "qué productos tienes", "muéstrame todo", "qué vendes", etc.
2. buscar_producto(nombre: string) - Busca productos específicos por nombre
3. validar_stock(productId: number) - Verifica stock disponible de un producto
4. crear_pedido(productId: number, quantity: number) - Crea un pedido

REGLAS DE BÚSQUEDA:
Cuando el usuario pregunte por categorías o productos específicos:
- "laptop", "laptops", "portátil", "notebooks" → buscar_producto con nombre="Laptop"
- "teléfono", "phone", "móvil", "celular" → buscar_producto con nombre="Phone"  
- "ratón", "mouse" → buscar_producto con nombre="Mouse"
- "teclado", "keyboard" → buscar_producto con nombre="Keyboard"
- "monitor", "pantalla" → buscar_producto con nombre="Monitor"

Cuando pregunte "qué tienes", "muéstrame todo", "catálogo" → USA listar_inventario()

FLUJO:
1. Si pide ver todo → listar_inventario()
2. Si busca producto específico → buscar_producto(nombre)
3. Si quiere comprar → validar_stock(productId) → crear_pedido(productId, quantity)

Sé amable, preciso y muestra siempre ID, nombre, precio y stock.`;

      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ functionDeclarations: geminiFunctions }],
        systemInstruction: systemInstruction,
      });

      // 4. Iniciar chat
      const chat = this.model.startChat({
        history: [],
      });

      // 5. Enviar mensaje del usuario
      let result = await chat.sendMessage(userMessage);
      let response = result.response;

      this.logger.log(`🤖 Gemini respondió`);

      // 6. Procesar function calls en bucle
      let finalResponse = '';
      let maxIterations = 10;
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        
        const functionCalls = response.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          // No hay más function calls, obtener texto final
          finalResponse = response.text();
          this.logger.log(`✅ Respuesta final obtenida (iteración ${iteration})`);
          break;
        }

        this.logger.log(`🔄 Procesando ${functionCalls.length} function call(s) (iteración ${iteration})`);

        // Ejecutar cada function call
        const functionResponses = [];
        
        for (const functionCall of functionCalls) {
          this.logger.log(`   Ejecutando: ${functionCall.name}`);
          
          const toolResult = await this.mcpClient.callTool(
            functionCall.name,
            functionCall.args
          );

          // Preparar respuesta para Gemini
          const responseText = toolResult.content
            .map(c => c.text)
            .join('\n');

          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: {
                result: responseText,
                success: !toolResult.isError,
                data: toolResult._meta?.data,
              },
            },
          });

          this.logger.log(`   ✅ ${functionCall.name}: ${toolResult.isError ? 'Error' : 'Éxito'}`);
        }

        // Enviar resultados de las funciones a Gemini
        result = await chat.sendMessage(functionResponses);
        response = result.response;
      }

      if (iteration >= maxIterations) {
        this.logger.warn('⚠️  Se alcanzó el límite de iteraciones');
        finalResponse = response.text() || 'Se alcanzó el límite de operaciones.';
      }

      return finalResponse;

    } catch (error: any) {
      this.logger.error('❌ Error procesando mensaje:', error);
      throw new Error(`Error en Gemini: ${error.message}`);
    }
  }
}
