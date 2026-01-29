/**
 * Tipos para o assistente de IA
 */

export interface AssistantRequest {
  description: string;
}

export interface AssistantData {
  title: string;
  description: string;
  category: 'BUG' | 'MELHORIA' | 'REQUISITO';
  additionalInformation?: string;
}

export interface AssistantResponse {
  success: boolean;
  data?: AssistantData;
  confidence?: number;
  processedIn?: string;
  error?: string;
}
