// Webhook External Notifier - Edge Function
// Notifica a suscriptores externos con reintentos y seguimiento
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'your-super-secret-key-change-this-in-production';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
const MAX_RETRIES = 3;

// Generar firma HMAC-SHA256
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Enviar webhook con reintentos
async function deliverWebhook(
  url: string,
  payload: any,
  secret: string,
  eventId: string,
  subscriptionId: string,
  supabase: any,
  attempt: number = 1
): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const signature = await generateSignature(payloadString, secret);

  try {
    console.log(`📤 Sending webhook to ${url} (attempt ${attempt}/${MAX_RETRIES})`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Event-Type': payload.event,
        'X-Idempotency-Key': payload.idempotency_key
      },
      body: payloadString
    });

    const responseBody = await response.text();

    // Registrar entrega
    await supabase.from('webhook_deliveries').insert({
      event_id: eventId,
      subscription_id: subscriptionId,
      attempt_number: attempt,
      status: response.ok ? 'success' : 'failed',
      response_status: response.status,
      response_body: responseBody.substring(0, 1000), // Limitar tamaño
      delivered_at: response.ok ? new Date().toISOString() : null
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }

    console.log(`✅ Webhook delivered successfully to ${url}`);
  } catch (error) {
    console.error(`❌ Delivery failed (attempt ${attempt}): ${error.message}`);
    
    // Registrar fallo
    await supabase.from('webhook_deliveries').insert({
      event_id: eventId,
      subscription_id: subscriptionId,
      attempt_number: attempt,
      status: 'failed',
      response_body: error.message
    });

    // Reintentar con backoff exponencial
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      await deliverWebhook(url, payload, secret, eventId, subscriptionId, supabase, attempt + 1);
    } else {
      console.error(`❌ Max retries reached for ${url}`);
      throw error;
    }
  }
}

// Enviar notificación a Telegram
async function sendTelegramNotification(payload: any): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram credentials not configured, skipping notification');
    return false;
  }

  try {
    const message = `
🔔 *Webhook Event Received*

📌 *Event:* \`${payload.event}\`
🆔 *ID:* \`${payload.idempotency_key}\`
📅 *Time:* ${new Date(payload.timestamp).toLocaleString()}

📦 *Data:*
\`\`\`json
${JSON.stringify(payload.data, null, 2)}
\`\`\`
    `.trim();

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (response.ok) {
      console.log(`✅ Telegram notification sent successfully`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Telegram notification failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Telegram notification error: ${error.message}`);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const payload = await req.json();
    const { event, idempotency_key } = payload;

    console.log(`📨 Processing webhook notification: ${event} (${idempotency_key})`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Obtener el evento de la base de datos
    const { data: eventData, error: eventError } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('idempotency_key', idempotency_key)
      .single();

    if (eventError || !eventData) {
      throw new Error('Event not found in database');
    }

    // Obtener suscriptores activos para este tipo de evento
    const { data: subscriptions, error: subsError } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('event_type', event)
      .eq('is_active', true);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`⚠️ No active subscriptions for event: ${event}`);
      
      // Aunque no haya suscriptores, enviar notificación a Telegram
      await sendTelegramNotification(payload);
      
      return new Response(JSON.stringify({
        status: 'no_subscribers',
        event,
        idempotency_key,
        telegram_sent: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📬 Found ${subscriptions.length} subscriber(s) for ${event}`);

    // Enviar notificación a Telegram
    const telegramSent = await sendTelegramNotification(payload);

    // Entregar a cada suscriptor
    const deliveries = [];
    for (const subscription of subscriptions) {
      try {
        await deliverWebhook(
          subscription.url,
          payload,
          subscription.secret,
          eventData.id,
          subscription.id,
          supabase
        );
        deliveries.push({ url: subscription.url, status: 'success' });
      } catch (error) {
        deliveries.push({ url: subscription.url, status: 'failed', error: error.message });
      }
    }

    return new Response(JSON.stringify({
      status: 'completed',
      event,
      idempotency_key,
      deliveries,
      total_subscribers: subscriptions.length,
      telegram_sent: telegramSent
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook notifier:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
})
