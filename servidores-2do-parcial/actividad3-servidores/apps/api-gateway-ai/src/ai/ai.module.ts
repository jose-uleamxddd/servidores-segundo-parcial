import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from '../gemini/gemini.service';
import { McpClientService } from '../mcp-client/mcp-client.service';

@Module({
  controllers: [AiController],
  providers: [GeminiService, McpClientService],
})
export class AiModule {}
