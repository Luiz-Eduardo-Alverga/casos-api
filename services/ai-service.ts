import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { AssistantRequest, AssistantResponse, AssistantData, AssistantDataFromAI, Product, User } from '../types/assistant.js';
import { buildFormAssistantPrompt } from '../prompts/form-assistant.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Serviço de integração com Google Gemini para processamento de relatórios
 */
export class AIService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;
  private generationConfig: GenerationConfig;
  private products: Product[] = [];
  private users: User[] = [];
  private dataLoaded = false;

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

    // Carregar dados de produtos e usuários
    this.loadData();
  }

  /**
   * Carrega os arquivos JSON de produtos e usuários
   */
  private loadData(): void {
    if (this.dataLoaded) return;

    try {
      // Carregar produtos
      const productsPath = join(__dirname, '../data/products.json');
      const productsData = readFileSync(productsPath, 'utf-8');
      this.products = JSON.parse(productsData);

      // Carregar usuários
      const usersPath = join(__dirname, '../data/users.json');
      const usersData = readFileSync(usersPath, 'utf-8');
      this.users = JSON.parse(usersData);

      this.dataLoaded = true;
    } catch (error) {
      console.error('Erro ao carregar arquivos de dados:', error);
      // Continuar com arrays vazios se houver erro
      this.products = [];
      this.users = [];
    }
  }

  /**
   * Mapeia ID de produto para objeto completo
   */
  private mapProductId(id: string | null | undefined): Product | undefined {
    if (!id) return undefined;
    return this.products.find(p => p.id === id);
  }

  /**
   * Mapeia IDs de usuários para objetos completos
   */
  private mapUserIds(ids: string[] | undefined): User[] {
    if (!ids || ids.length === 0) return [];
    return this.users.filter(u => ids.includes(u.id));
  }

  /**
   * Valida se o conteúdo fornecido é suficiente para processamento
   */
  private validateContent(content: string): { isValid: boolean; error?: string } {
    const trimmed = content.trim();
    
    // Verificar tamanho mínimo (pelo menos 20 caracteres)
    if (trimmed.length < 20) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido é muito curto. Por favor, forneça uma descrição mais detalhada do bug, melhoria ou requisito.',
      };
    }

    // Lista de palavras/frases genéricas que indicam conteúdo inválido
    const invalidPatterns = [
      /^teste$/i,
      /^test$/i,
      /^testando$/i,
      /^teste teste$/i,
      /^123$/i,
      /^abc$/i,
      /^lorem ipsum/i,
      /^placeholder$/i,
    ];

    // Verificar se o conteúdo é apenas uma palavra genérica
    if (invalidPatterns.some(pattern => pattern.test(trimmed))) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido não contém informações suficientes sobre um bug, melhoria ou requisito. Por favor, forneça uma descrição mais detalhada.',
      };
    }

    // Verificar se tem pelo menos algumas palavras (mínimo 3 palavras)
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido é muito curto. Por favor, forneça uma descrição mais detalhada com pelo menos algumas palavras.',
      };
    }

    return { isValid: true };
  }

  /**
   * Valida se a resposta da IA contém informações suficientes
   */
  private validateAIResponse(data: AssistantData): { isValid: boolean; error?: string } {
    // Contar quantas vezes "Não informado" aparece nos campos principais
    const naoInformadoCount = [
      data.title,
      data.description,
      data.additionalInformation || '',
    ]
      .join(' ')
      .toLowerCase()
      .split('não informado')
      .length - 1;

    // Se houver mais de 2 ocorrências de "Não informado", considerar inválido
    if (naoInformadoCount > 2) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido não contém informações suficientes para processar um relatório válido. Por favor, forneça uma descrição mais detalhada do bug, melhoria ou requisito.',
      };
    }
    // Verificar se o título contém "Não informado"
    if (data.title.toLowerCase().includes('não informado')) {
      return {
        isValid: false,
        error: 'Não foi possível identificar informações suficientes no conteúdo fornecido. Por favor, forneça uma descrição mais detalhada.',
      };
    }

    // Verificar se a descrição principal tem conteúdo real (não apenas "Não informado")
    const descriptionLower = data.description.toLowerCase();
    const descriptionWords = descriptionLower.split(/\s+/).filter(w => w.length > 0);
    const naoInformadoWords = descriptionLower.split('não informado').length - 1;
    
    // Se mais de 50% das palavras são "não informado", considerar inválido
    if (descriptionWords.length > 0 && (naoInformadoWords / descriptionWords.length) > 0.5) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido não contém informações suficientes. Por favor, forneça uma descrição mais detalhada do problema ou requisito.',
      };
    }

    // Verificar padrões genéricos no título que indicam conteúdo inventado
    const titleLower = data.title.toLowerCase();
    const genericTitlePatterns = [
      /produto\s*>\s*tela\s*x/i, // "Produto > Tela X"
      /produto\s*>\s*[^:]*:\s*ajustar/i, // "Produto > ...: Ajustar"
      /produto\s*>\s*[^:]*:\s*melhorar/i, // "Produto > ...: Melhorar"
      /produto\s*>\s*[^:]*:\s*corrigir/i, // "Produto > ...: Corrigir"
      /^[^>]*>\s*[^:]*:\s*(ajustar|melhorar|corrigir|implementar)/i, // Qualquer título genérico
    ];

    if (genericTitlePatterns.some(pattern => pattern.test(titleLower))) {
      // Verificar se a descrição também é genérica
      const genericDescriptionPatterns = [
        /o layout da tela está desalinhado/i,
        /dificulta a visualização dos dados/i,
        /melhorar a organização/i,
        /facilitar a visualização/i,
        /exibir os dados de forma organizada/i,
        /permitir a fácil identificação/i,
        /validar o layout em diferentes resoluções/i,
        /melhorar a usabilidade/i,
        /ajustar o layout/i,
      ];

      const hasGenericDescription = genericDescriptionPatterns.some(pattern => 
        pattern.test(descriptionLower)
      );

      // Se o título é genérico E a descrição contém frases genéricas comuns, é provável que seja inventado
      if (hasGenericDescription) {
        return {
          isValid: false,
          error: 'O áudio fornecido não contém informações suficientes ou está sem conteúdo. Por favor, grave um áudio com uma descrição detalhada do bug, melhoria ou requisito.',
        };
      }
    }

    // Verificar se a descrição contém muitas frases genéricas/vagas
    const vaguePhrases = [
      'está desalinhado',
      'dificulta a visualização',
      'melhorar a organização',
      'facilitar a visualização',
      'exibir os dados',
      'permitir a fácil',
      'validar o layout',
      'melhorar a usabilidade',
      'ajustar o layout',
      'organizar melhor',
      'melhorar a experiência',
      'otimizar o processo',
    ];

    const vagueCount = vaguePhrases.filter(phrase => 
      descriptionLower.includes(phrase)
    ).length;

    // Se houver mais de 3 frases vagas, provavelmente é conteúdo genérico
    if (vagueCount > 3) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido parece ser muito genérico e não contém informações específicas. Por favor, forneça uma descrição mais detalhada e específica do problema ou requisito.',
      };
    }

    // Verificar se a descrição é muito curta ou vazia (menos de 100 caracteres)
    if (data.description.trim().length < 100) {
      return {
        isValid: false,
        error: 'O conteúdo fornecido é muito curto. Por favor, forneça uma descrição mais detalhada do bug, melhoria ou requisito.',
      };
    }

    return { isValid: true };
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

      // Validar conteúdo antes de processar
      // if (hasDescription && request.description) {
      //   const contentValidation = this.validateContent(request.description);
      //   if (!contentValidation.isValid) {
      //     return {
      //       success: false,
      //       error: contentValidation.error || 'Conteúdo inválido',
      //     };
      //   }
      // }

      // Construir prompt com dados de produtos e usuários
      const prompt = buildFormAssistantPrompt(this.products, this.users);

      // Construir partes do conteúdo para o Gemini
      const parts: any[] = [];

      // Adicionar prompt de instrução
      parts.push({ text: prompt });

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
          parts.push({ text: '\n\nIMPORTANTE: Transcreva o áudio fornecido e processe as informações conforme o prompt acima. Analise o áudio transcrito para identificar o produto e usuários mencionados. Se o áudio estiver vazio, sem fala, ou contiver apenas ruído/silêncio, você DEVE retornar um JSON com todos os campos preenchidos com "Não informado" e a categoria como "BUG". Não invente informações se o áudio não contiver conteúdo útil.' });
        } else {
          parts.push({ text: '\n\nConsidere também o áudio fornecido para complementar a descrição em texto. Analise o áudio transcrito para identificar o produto e usuários mencionados. Se o áudio estiver vazio ou sem conteúdo útil, use apenas a descrição em texto fornecida.' });
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
      let parsedData: AssistantDataFromAI;
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

      // Validar estrutura básica
      if (!parsedData.title || !parsedData.description || !parsedData.category) {
        return {
          success: false,
          error: 'Resposta da IA está incompleta',
        };
      }

      // Validar se a resposta contém informações suficientes
      const responseValidation = this.validateAIResponse({
        title: parsedData.title,
        description: parsedData.description,
        category: parsedData.category,
        additionalInformation: parsedData.additionalInformation,
      });
      if (!responseValidation.isValid) {
        return {
          success: false,
          error: responseValidation.error || 'Conteúdo insuficiente na resposta',
        };
      }

      // Validar categoria
      const categoriaUpper = parsedData.category.toUpperCase();
      if (!['BUG', 'MELHORIA', 'REQUISITO'].includes(categoriaUpper)) {
        parsedData.category = 'BUG'; // Default
      } else {
        parsedData.category = categoriaUpper as 'BUG' | 'MELHORIA' | 'REQUISITO';
      }

      // Mapear IDs para objetos completos
      const matchedProduct = this.mapProductId(parsedData.productId);
      const matchedUsers = this.mapUserIds(parsedData.userIds);

      // Construir resposta final
      const finalData: AssistantData = {
        title: parsedData.title,
        description: parsedData.description,
        category: parsedData.category,
        additionalInformation: parsedData.additionalInformation,
      };

      // Adicionar produto e usuários se encontrados
      if (matchedProduct) {
        finalData.product = matchedProduct;
      }

      if (matchedUsers.length > 0) {
        finalData.users = matchedUsers;
      }

      const processedIn = `${Date.now() - startTime}ms`;

      return {
        success: true,
        data: finalData,
        confidence: 0.95,
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
