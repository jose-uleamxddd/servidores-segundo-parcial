import { Module, Global } from '@nestjs/common';
import { WebhookPublisherService } from './webhook-publisher.service';

@Global()
@Module({
  providers: [WebhookPublisherService],
  exports: [WebhookPublisherService],
})
export class WebhookModule {}
