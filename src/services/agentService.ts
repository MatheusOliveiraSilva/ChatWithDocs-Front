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

export interface AgentRequest {
  thread_id: string;
  message: string;
  llm_config: LLMConfig;
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
    llmConfig: LLMConfig = DEFAULT_LLM_CONFIG
  ): Promise<AgentResponse> => {
    try {
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
        `${API_URL}/agent/chat`,
        {
          thread_id: threadId,
          message: message,
          llm_config: llmConfig
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
  }
};

export default agentService; 