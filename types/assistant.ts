/**
 * Tipos para o assistente de IA
 */

export interface AssistantRequest {
  description?: string;
  audio?: Buffer; // Buffer do arquivo de áudio
  audioMimeType?: string; // Tipo MIME do áudio (ex: 'audio/mpeg', 'audio/wav')
}

export interface Product {
  id: string;
  nome_projeto: string;
  setor: string | null;
}

export interface User {
  id: string;
  nome_suporte: string;
  setor: string | null;
  usuario_discord: string | null;
}

export interface AssistantDataFromAI {
  title: string;
  description: string;
  category: 'BUG' | 'MELHORIA' | 'REQUISITO';
  additionalInformation?: string;
  productId?: string; // ID do produto identificado pela IA (apenas um produto por report)
  userIds?: string[]; // IDs dos usuários identificados pela IA
}

export interface AssistantData {
  title: string;
  description: string;
  category: 'BUG' | 'MELHORIA' | 'REQUISITO';
  additionalInformation?: string;
  product?: Product; // Produto completo identificado
  users?: User[]; // Usuários completos identificados
}

export interface AssistantResponse {
  success: boolean;
  data?: AssistantData;
  confidence?: number;
  processedIn?: string;
  error?: string;
}
