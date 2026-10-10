export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

export interface WhatsAppIncomingLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'location' | 'button' | 'unknown';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  location?: WhatsAppIncomingLocation;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppIncomingMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}
