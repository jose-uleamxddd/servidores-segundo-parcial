/**
 * Controlador principal del AI Gateway
 */
import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { McpClientService } from '../mcp-client/mcp-client.service';
import { AskAiDto } from './dto/ask-ai.dto';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private geminiService: GeminiService,
    private mcpClient: McpClientService,
  ) {}

  /**
   * Endpoint principal para hacer preguntas a la IA
   */
  @Post('ask')
  async ask(@Body() askAiDto: AskAiDto) {
    try {
      this.logger.log(`📥 Nueva pregunta recibida: "${askAiDto.message}"`);
      
      const response = await this.geminiService.processMessage(askAiDto.message);
      
      return {
        success: true,
        question: askAiDto.message,
        answer: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Error procesando pregunta:', error);
      return {
        success: false,
        error: error.message,
        question: askAiDto.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtener tools disponibles
   */
  @Get('tools')
  async getTools() {
    try {
      const tools = await this.mcpClient.getAvailableTools();
      return {
        success: true,
        tools,
        total: tools.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check del sistema
   */
  @Get('health')
  async health() {
    const mcpHealthy = await this.mcpClient.healthCheck();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api_gateway: 'ok',
        mcp_server: mcpHealthy ? 'ok' : 'error',
        gemini: 'ok',
      },
    };
  }
}
