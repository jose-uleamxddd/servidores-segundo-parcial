import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhookPayload } from './webhook-events.types';

@Injectable()
export class WebhookPublisherService {
  private readonly logger = new Logger(WebhookPublisherService.name);
  private readonly webhookSecret = process.env.WEBHOOK_SECRET || 'your-super-secret-key-change-this-in-production';
  private readonly supabaseUrl = process.env.SUPABASE_URL;
  private readonly supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private generateSignature(payload: string): string {
    return createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
  }

  async publishWebhook(payload: WebhookPayload): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseServiceRoleKey) {
      this.logger.warn('Supabase credentials not configured. Skipping webhook publishing.');
      return;
    }

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);

    try {
      this.logger.log(`Publishing webhook: ${payload.event} (${payload.idempotency_key})`);

      const loggerUrl = `${this.supabaseUrl}/functions/v1/webhook-event-logger`;
      const loggerResponse = await fetch(loggerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseServiceRoleKey}`,
          'X-Webhook-Signature': signature,
        },
        body: payloadString,
      });

      if (!loggerResponse.ok) {
        throw new Error(`Logger failed: ${loggerResponse.status}`);
      }

      const notifierUrl = `${this.supabaseUrl}/functions/v1/webhook-external-notifier`;
      const notifierResponse = await fetch(notifierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseServiceRoleKey}`,
        },
        body: payloadString,
      });

      if (notifierResponse.ok) {
        const result = await notifierResponse.json();
        this.logger.log(`Webhook sent to ${result.total_subscribers || 0} subscriber(s)`);
      }
    } catch (error) {
      this.logger.error(`Error publishing webhook: ${error.message}`);
      throw error;
    }
  }
}
