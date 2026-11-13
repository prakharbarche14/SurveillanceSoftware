/**
 * Production Integration Adapter Layer for EduTrack ERP
 * ---------------------------------------------------------------------------
 * Prototype runs locally with persistent IndexedDB/localStorage + Express API.
 * When deploying to production, configure the environment variables in .env:
 *   - VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY (Client Auth + RLS PostgREST)
 *   - WHATSAPP_CLOUD_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID (Server-side Cloud API)
 *   - SMS_PROVIDER_API_KEY & SMS_DLT_ENTITY_ID (Server-side Indian DLT SMS)
 */

export interface WhatsAppCloudPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

export interface DltSmsPayload {
  sender: string;
  dltEntityId: string;
  templateId: string;
  mobile: string;
  message: string;
}

export function buildWhatsAppTemplatePayload(
  recipientE164: string,
  templateName: string,
  params: string[]
): WhatsAppCloudPayload {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientE164.replace(/[^0-9]/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_IN' },
      components: [
        {
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };
}

export function buildDltSmsPayload(
  recipientE164: string,
  message: string,
  templateId = 'DLT_EDUTRACK_ALERT_01'
): DltSmsPayload {
  return {
    sender: 'EDUTRK',
    dltEntityId: 'CONFIGURED_ON_SERVER',
    templateId,
    mobile: recipientE164.replace(/[^0-9]/g, ''),
    message,
  };
}

export function getIntegrationReadiness() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    supabaseConfigured: Boolean(
      supabaseUrl &&
        supabaseKey &&
        !supabaseUrl.includes('your-project') &&
        !supabaseKey.includes('your-public')
    ),
    storageMode: 'Prototype Local + Express Tenant API (Supabase RLS Ready)',
    messagingMode: 'Simulated Outbox (WhatsApp Business Cloud API & Indian DLT SMS Ready)',
  };
}
