import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { AssistantRequest, AssistantResponse, AssistantData } from '../types/assistant.js';
import { FORM_ASSISTANT_PROMPT } from '../prompts/form-assistant.js';

/**
 * Serviço de integração com Google Gemini para processamento de relatórios
 */
export class AIService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;
  private generationConfig: GenerationConfig;

  constructor(apiKey: string, modelName = 'gemini-2.0-flash') {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY é obrigatória');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    
    this.generationConfig = {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    };

    this.model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: this.generationConfig,
    });
  }

  /**
   * Processa um relatório e retorna dados estruturados
   */
  async processReport(request: AssistantRequest): Promise<AssistantResponse> {
    const startTime = Date.now();

    try {
      // Validar que pelo menos description ou audio foi fornecido
      const hasDescription = request.description && request.description.trim().length > 0;
      const hasAudio = request.audio && request.audio.length > 0;

      if (!hasDescription && !hasAudio) {
        return {
          success: false,
          error: 'É necessário fornecer pelo menos uma descrição (texto) ou um arquivo de áudio',
        };
      }

      // Construir partes do conteúdo para o Gemini
      const parts: any[] = [];

      // Adicionar prompt de instrução
      parts.push({ text: FORM_ASSISTANT_PROMPT });

      // Se houver descrição em texto, adicionar
      if (hasDescription) {
        parts.push({ text: `\n\nDescrição fornecida:\n${request.description}` });
      }

      // Se houver áudio, adicionar
      if (hasAudio && request.audioMimeType) {
        // Converter buffer para base64
        const audioBase64 = request.audio?.toString('base64') || '';
        
        // Determinar o tipo de arquivo baseado no MIME type
        let fileData: any = {
          inlineData: {
            data: audioBase64,
            mimeType: request.audioMimeType,
          },
        };

        parts.push(fileData);
        
        // Adicionar instrução para processar o áudio
        if (!hasDescription) {
          parts.push({ text: '\n\nPor favor, transcreva o áudio fornecido e processe as informações conforme o prompt acima.' });
        } else {
          parts.push({ text: '\n\nConsidere também o áudio fornecido para complementar a descrição em texto.' });
        }
      }

      parts.push({ text: '\n\nRetorne APENAS o JSON válido:' });

      // Chamar Gemini com JSON mode
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          ...this.generationConfig,
          responseMimeType: 'application/json',
        },
      });

      const response = result.response;
      const text = response.text();

      // Parse do JSON retornado
      let parsedData: AssistantData;
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        // Tentar extrair JSON se houver texto adicional
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Resposta da IA não contém JSON válido');
        }
      }

      console.log(parsedData);

      // Validar estrutura básica
      if (!parsedData.title || !parsedData.description || !parsedData.category) {
        return {
          success: false,
          error: 'Resposta da IA está incompleta',
        };
      }

      // Validar categoria
      const categoriaUpper = parsedData.category.toUpperCase();
      if (!['BUG', 'MELHORIA', 'REQUISITO'].includes(categoriaUpper)) {
        parsedData.category = 'BUG'; // Default
      } else {
        parsedData.category = categoriaUpper as 'BUG' | 'MELHORIA' | 'REQUISITO';
      }

      const processedIn = `${Date.now() - startTime}ms`;

      return {
        success: true,
        data: parsedData,
        confidence: 0.95, // Pode ser calculado baseado em métricas futuras
        processedIn,
      };
    } catch (error: any) {
      const processedIn = `${Date.now() - startTime}ms`;
      
      return {
        success: false,
        error: error.message || 'Erro ao processar relatório com IA',
        processedIn,
      };
    }
  }

  /**
   * Retorna o nome do modelo configurado
   */
  getModelName(): string {
    return this.modelName;
  }
}
