import axios from 'axios';
import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

// Types
export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface LLMConfig {
  model_id: string;
  provider: string;
  reasoning_effort?: ReasoningEffort;
  think_mode?: boolean;
  temperature?: number;
}

export interface MemoryConfig {
  [key: string]: any;
}

export interface AgentRequest {
  thread_id: string;
  input: string;
  thread_name?: string;
  llm_config: LLMConfig;
  memory_config?: MemoryConfig;
}

export interface AgentResponse {
  thread_id: string;
  response: any;
  updated_conversation: {
    id: number;
    thread_id: string;
    messages: [string, string][];
    last_used: string;
  }
}

// Interface para streaming de chunks de resposta
export interface StreamedChunk {
  content: string;
  type: 'thinking' | 'text' | 'error' | 'end';
  meta?: any;
}

// Available models by provider
export const AVAILABLE_MODELS = {
  openai: [
    { id: 'o3-mini', name: 'O3-Mini' },
    { id: 'o1', name: 'O1' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' }
  ]
};

// Default configuration
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  model_id: 'gpt-4o',
  provider: 'openai',
  reasoning_effort: 'medium',
  think_mode: false,
  temperature: 0.7
};

// Agent service
const agentService = {
  // Invoke agent with message and configuration
  invokeAgent: async (
    threadId: string,
    message: string,
    llmConfig: LLMConfig = DEFAULT_LLM_CONFIG,
    threadName?: string,
    memoryConfig: MemoryConfig = {}
  ): Promise<AgentResponse> => {
    try {
      // Ajustar configuração conforme regras específicas dos modelos
      const adjustedConfig = { ...llmConfig };
      
      // Para Claude Sonnet, quando think_mode está ativado, a temperatura deve ser 1
      if (adjustedConfig.provider === 'anthropic' && 
          adjustedConfig.model_id === 'claude-3-7-sonnet' && 
          adjustedConfig.think_mode) {
        console.log('Detectado Claude Sonnet com think_mode ativado, fixando temperatura em 1');
        adjustedConfig.temperature = 1;
      }
    
      // Primeiro verifica se a thread existe via conversation API
      let threadExists = false;
      
      try {
        await axios.get(`${API_URL}/conversation/${threadId}`, {
          headers: authService.getAuthHeader(),
          withCredentials: true
        });
        threadExists = true;
      } catch (error) {
        // Se a conversa não existe, é normal receber um erro 404
        // Vamos criar a conversa apenas se recebermos uma resposta do agente
        console.log('Conversa não encontrada, será criada após resposta do agente');
      }
      
      // Invoca o agente
      const response = await axios.post(
        `${API_URL}/agent/chat/query_stream`,
        {
          thread_id: threadId,
          input: message,
          thread_name: threadName,
          llm_config: adjustedConfig,
          memory_config: memoryConfig
        },
        {
          headers: authService.getAuthHeader(),
          withCredentials: true
        }
      );
      
      // Se não existia conversa antes e temos uma resposta, podemos criar a conversa agora
      if (!threadExists && response.data.updated_conversation) {
        // A conversa será criada automaticamente pelo backend com a primeira mensagem
        console.log('Conversa criada com sucesso:', response.data.updated_conversation.thread_id);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error invoking agent:', error);
      throw error;
    }
  },
  
  // Invocar agente com streaming de resposta
  streamAgent: (
    threadId: string,
    message: string,
    llmConfig: LLMConfig = DEFAULT_LLM_CONFIG,
    onChunk: (chunk: StreamedChunk) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: any) => void,
    threadName?: string,
    memoryConfig: MemoryConfig = {},
    previousMessages?: [string, string][]
  ) => {
    // Ajustar configuração conforme regras específicas dos modelos
    const adjustedConfig = { ...llmConfig };
    
    // Para Claude Sonnet, quando think_mode está ativado, a temperatura deve ser 1
    if (adjustedConfig.provider === 'anthropic' && 
        adjustedConfig.model_id === 'claude-3-7-sonnet' && 
        adjustedConfig.think_mode) {
      console.log('Detectado Claude Sonnet com think_mode ativado, fixando temperatura em 1');
      adjustedConfig.temperature = 1;
    }
    
    // Criar corpo da requisição para o novo formato
    const body = JSON.stringify({
      input: message,
      thread_id: threadId,
      thread_name: threadName,
      llm_config: adjustedConfig,
      previous_messages: previousMessages  // Adicionando mensagens anteriores
    });
    
    console.log(`Iniciando streaming para thread: ${threadId}`, {
      threadName,
      modelId: adjustedConfig.model_id,
      provider: adjustedConfig.provider,
      thinkMode: adjustedConfig.think_mode,
      temperature: adjustedConfig.temperature,
      previousMessagesCount: previousMessages?.length || 0
    });
    
    // Obter token de autenticação
    const token = localStorage.getItem('token');
    
    // Conectar ao endpoint de streaming
    let fullResponse = '';
    let currentThinking = ''; // Armazenar pensamentos para Claude 3.7 Sonnet
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: body,
      credentials: 'include' as RequestCredentials,
    };
    
    fetch(`${API_URL}/agent/chat/query_stream`, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Conexão estabelecida, aguardando chunks...');
        
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        function processStream(): Promise<void> {
          return reader.read().then(({ value, done }) => {
            if (done) {
              console.log('Stream finalizado, resposta completa:', fullResponse.substring(0, 30) + '...');
              // Ao terminar, verificar se temos conteúdo válido
              if (fullResponse.trim().length > 0) {
                onComplete(fullResponse);
              } else {
                // Se não tiver conteúdo válido, tratar como erro
                console.error('A resposta do servidor está vazia');
                onError(new Error("A resposta do servidor está vazia"));
              }
              return;
            }
            
            const chunk = decoder.decode(value);
            console.log('Chunk bruto recebido:', chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''));
            
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '');
                try {
                  const data = JSON.parse(jsonStr);
                  console.log('Dados do streaming:', data);
                  
                  if (data.error) {
                    console.error('Erro recebido do servidor:', data.error);
                    onError(new Error(data.error));
                    return;
                  }
                  
                  if (data.content === '[DONE]' || data.type === 'end') {
                    console.log('Marcador de fim recebido, finalizando streaming');
                    onComplete(fullResponse);
                    return;
                  }
                  
                  // Processar diferentes tipos de chunks
                  if (data.type === 'thinking') {
                    // Acumular pensamentos separadamente
                    currentThinking += data.content;
                    console.log('Pensamento recebido:', data.content.substring(0, 30) + (data.content.length > 30 ? '...' : ''));
                    
                    // Notificar o chunk como thinking
                    onChunk({
                      content: data.content,
                      type: 'thinking',
                      meta: data.meta
                    });
                  } else if (data.type === 'text') {
                    // Resposta final
                    console.log('Texto final recebido:', data.content.substring(0, 30) + (data.content.length > 30 ? '...' : ''));
                    fullResponse += data.content;
                    
                    // Notificar o chunk como texto
                    onChunk({
                      content: data.content,
                      type: 'text',
                      meta: data.meta
                    });
                  } else if (data.content) {
                    // Fallback para formatos antigos
                    console.log('Conteúdo recebido (formato antigo):', data.content.substring(0, 30) + (data.content.length > 30 ? '...' : ''));
                    fullResponse += data.content;
                    
                    // Notificar como texto padrão
                    onChunk({
                      content: data.content,
                      type: 'text',
                      meta: data.meta
                    });
                  }
                } catch (e) {
                  console.warn('Failed to parse JSON:', jsonStr, e);
                }
              }
            }
            
            return processStream();
          })
          .catch(error => {
            console.error('Error processing stream:', error);
            
            // Se já temos algum conteúdo quando ocorrer o erro, retornar o que temos
            if (fullResponse.trim().length > 0) {
              console.log('Erro durante streaming, mas retornando resposta parcial:', fullResponse.substring(0, 30) + '...');
              onComplete(fullResponse);
            } else {
              onError(error);
            }
          });
        }
        
        return processStream();
      })
      .catch(error => {
        console.error('Error in streaming, sem conexão:', error);
        onError(error);
      });
  }
};

export default agentService; 