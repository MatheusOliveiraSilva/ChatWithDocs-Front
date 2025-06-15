const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Função para converter formato Python dict para JSON válido
const convertPythonToJson = (pythonStr: string): string => {
  try {
    // Verificar se já é JSON válido
    if (pythonStr.startsWith('{') && pythonStr.endsWith('}')) {
      try {
        JSON.parse(pythonStr);
        return pythonStr; // Já é JSON válido
      } catch {
        // Não é JSON válido, continuar processamento
      }
    }
    
    // Extrair dados específicos do formato LangGraph
    const contentMatch = pythonStr.match(/'content':\s*AIMessageChunk\([^)]*content='([^']*)'[^)]*\)/);
    const metadataMatch = pythonStr.match(/'metadata':\s*\{([^}]+)\}/);
    
    let content = '';
    if (contentMatch) {
      content = contentMatch[1];
      // Decodificar caracteres escapados do Python
      content = content
        .replace(/\\n/g, '\n')      // Converter \n literal para quebra de linha real
        .replace(/\\t/g, '\t')      // Converter \t literal para tab real
        .replace(/\\r/g, '\r')      // Converter \r literal para carriage return real
        .replace(/\\'/g, "'")       // Converter \' literal para aspas simples
        .replace(/\\"/g, '"')       // Converter \" literal para aspas duplas
        .replace(/\\\\/g, '\\');    // Converter \\ literal para barra invertida simples
    }
    
    let metadata: Record<string, any> = {};
    if (metadataMatch) {
      // Processar metadata Python dict para JSON
      const metadataStr = metadataMatch[1];
      const metadataPairs = metadataStr.split(',');
      
      for (const pair of metadataPairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          // Remover aspas simples e processar diferentes tipos
          const cleanKey = key.replace(/'/g, '');
          let cleanValue = value.replace(/'/g, '');
          
          // Converter números
          if (!isNaN(Number(cleanValue))) {
            metadata[cleanKey] = Number(cleanValue);
          } 
          // Converter booleanos
          else if (cleanValue === 'True') {
            metadata[cleanKey] = true;
          } else if (cleanValue === 'False') {
            metadata[cleanKey] = false;
          } else if (cleanValue === 'None') {
            metadata[cleanKey] = null;
          } 
          // Manter como string
          else {
            metadata[cleanKey] = cleanValue.replace(/"/g, '');
          }
        }
      }
    }
    
    // Verificar se há response_metadata no AIMessageChunk
    const responseMetadataMatch = pythonStr.match(/response_metadata=\{([^}]*)\}/);
    let responseMetadata: Record<string, any> = {};
    
    if (responseMetadataMatch) {
      const responseMetadataStr = responseMetadataMatch[1];
      const pairs = responseMetadataStr.split(',');
      
      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          const cleanKey = key.replace(/'/g, '').replace(/"/g, '');
          const cleanValue = value.replace(/'/g, '').replace(/"/g, '');
          responseMetadata[cleanKey] = cleanValue;
        }
      }
    }
    
    // Criar estrutura JSON
    const result = {
      content: {
        content: content,
        response_metadata: responseMetadata
      },
      metadata: metadata
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Erro ao converter Python para JSON:', error);
    console.error('String original:', pythonStr.substring(0, 200) + '...');
    
    // Fallback: tentar extrair apenas o conteúdo de texto básico
    const basicContentMatch = pythonStr.match(/content='([^']*)'/);
    if (basicContentMatch) {
      let fallbackContent = basicContentMatch[1];
      // Decodificar caracteres escapados do Python
      fallbackContent = fallbackContent
        .replace(/\\n/g, '\n')      // Converter \n literal para quebra de linha real
        .replace(/\\t/g, '\t')      // Converter \t literal para tab real
        .replace(/\\r/g, '\r')      // Converter \r literal para carriage return real
        .replace(/\\'/g, "'")       // Converter \' literal para aspas simples
        .replace(/\\"/g, '"')       // Converter \" literal para aspas duplas
        .replace(/\\\\/g, '\\');    // Converter \\ literal para barra invertida simples
      
      return JSON.stringify({
        content: { content: fallbackContent },
        metadata: { langgraph_node: 'agent' }
      });
    }
    
    // Se tudo falhar, retornar estrutura vazia
    return JSON.stringify({
      content: { content: '' },
      metadata: { langgraph_node: 'agent' }
    });
  }
};

// Types
export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface LLMConfig {
  model_id?: string;
  provider: string;
  model: string; // Campo usado pelo novo backend
  reasoning_effort?: ReasoningEffort;
  think_mode?: boolean;
  temperature?: number;
}

export interface MemoryConfig {
  [key: string]: any;
}

// ✅ ATUALIZADO: Interface que corresponde exatamente ao formato esperado pelo backend
export interface ChatMessage {
  role: string;  // "user", "assistant", "system"
  content: string;
}

export interface AgentRequest {
  messages: ChatMessage[];  // ✅ MUDANÇA: Lista de ChatMessage ao invés de input simples
  thread_id: string;
  llm_config?: LLMConfig;   // ✅ MUDANÇA: Opcional conforme o backend
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
  type: 'thinking' | 'text' | 'error' | 'end' | 'token' | 'tool_execution';
  meta?: any;
  tool_info?: {
    node: string;
    step: number;
  };
}

// Available models by provider
export const AVAILABLE_MODELS = {
  azure: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4', name: 'GPT-4' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4', name: 'GPT-4' },
  ]
};

// Default configuration (adaptado para o backend real)
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o',
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
    // Este método agora é um wrapper para o streaming
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      agentService.streamAgent(
        threadId,
        message,
        llmConfig,
        (chunk) => {
          if (chunk.type === 'token' || chunk.type === 'text') {
            fullResponse += chunk.content;
          }
        },
        () => {
          // Simular resposta no formato antigo
          resolve({
            thread_id: threadId,
            response: fullResponse,
            updated_conversation: {
              id: Date.now(),
              thread_id: threadId,
              messages: [['user', message], ['assistant', fullResponse]],
              last_used: new Date().toISOString()
            }
          });
        },
        reject,
        threadName,
        memoryConfig
      );
    });
  },
  
  // Invocar agente com streaming de resposta (adaptado para backend real com LangGraph)
  streamAgent: (
    threadId: string, // Thread ID necessário para o backend
    message: string,
    llmConfig: LLMConfig = DEFAULT_LLM_CONFIG,
    onChunk: (chunk: StreamedChunk) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: any) => void,
    threadName?: string,
    _memoryConfig: MemoryConfig = {},
    previousMessages?: [string, string][]
  ) => {
    // Adaptar configuração para o formato do backend real
    const adaptedConfig = {
      provider: llmConfig.provider || 'openai',
      model: llmConfig.model || llmConfig.model_id || 'gpt-4o',
      temperature: llmConfig.temperature || 0.0
    };
    
    // ✅ CONSTRUIR MENSAGENS: Usar o formato ChatMessage esperado pelo backend
    const messages: ChatMessage[] = [];
    
    // Adicionar mensagens anteriores se fornecidas (converter formato)
    if (previousMessages && previousMessages.length > 0) {
      previousMessages.forEach(([role, content]) => {
        messages.push({ role, content });
      });
    }
    
    // Adicionar a nova mensagem do usuário
    messages.push({ role: 'user', content: message });
    
    // ✅ CRIAR REQUISIÇÃO: Usar o formato AgentRequest correto
    const agentRequest: AgentRequest = {
      messages: messages,
      thread_id: threadId,
      llm_config: adaptedConfig
    };
    
    const body = JSON.stringify(agentRequest);
    
    console.log(`Iniciando streaming LangGraph:`, {
      threadId,
      threadName,
      provider: adaptedConfig.provider,
      model: adaptedConfig.model,
      temperature: adaptedConfig.temperature,
      messagesCount: messages.length,
      request: agentRequest // ✅ ADICIONADO: Log da requisição completa
    });
    
    // Conectar ao endpoint correto do backend real
    let fullResponse = '';
    let currentToolExecution: string | null = null;
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: body,
    };
    
    fetch(`${API_URL}/agent/chat`, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Conexão LangGraph estabelecida, aguardando chunks...');
        
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        function processStream(): Promise<void> {
          return reader.read().then(({ value, done }) => {
            if (done) {
              console.log('Stream LangGraph finalizado, resposta completa:', fullResponse.substring(0, 50) + '...');
              
              // Se ainda está executando ferramenta, notificar que terminou
              if (currentToolExecution) {
                onChunk({
                  content: '',
                  type: 'end',
                  meta: { tool_finished: currentToolExecution }
                });
                currentToolExecution = null;
              }
              
              if (fullResponse.trim().length > 0) {
                onComplete(fullResponse);
              } else {
                console.error('A resposta do LangGraph está vazia');
                onError(new Error("A resposta do servidor está vazia"));
              }
              return;
            }
            
            const chunk = decoder.decode(value);
            console.log('Chunk LangGraph bruto:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
            
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const rawData = line.replace('data: ', '');
                
                // Verificar se é o marcador de fim
                if (rawData === '[DONE]') {
                  console.log('Marcador [DONE] recebido do LangGraph');
                  onComplete(fullResponse);
                  return;
                }
                
                try {
                  // Converter formato Python dict para JSON válido
                  const jsonStr = convertPythonToJson(rawData);
                  const data = JSON.parse(jsonStr);
                  
                  console.log('Dados LangGraph processados:', data);
                  
                  if (data.error) {
                    console.error('Erro recebido do LangGraph:', data.error);
                    onError(new Error(data.error));
                    return;
                  }
                  
                  // Processar formato LangGraph: {'content': AIMessageChunk(...), 'metadata': {...}}
                  if (data.content && data.metadata) {
                    const langGraphNode = data.metadata.langgraph_node;
                    const langGraphStep = data.metadata.langgraph_step;
                    
                    // Verificar se é execução de ferramenta (não é node 'agent')
                    if (langGraphNode && langGraphNode !== 'agent') {
                      // Se mudou de ferramenta, notificar fim da anterior
                      if (currentToolExecution && currentToolExecution !== langGraphNode) {
                        onChunk({
                          content: '',
                          type: 'end',
                          meta: { tool_finished: currentToolExecution }
                        });
                      }
                      
                      // Se é uma nova ferramenta, notificar início
                      if (currentToolExecution !== langGraphNode) {
                        currentToolExecution = langGraphNode;
                        onChunk({
                          content: `Executando ferramenta: ${langGraphNode}`,
                          type: 'tool_execution',
                          tool_info: {
                            node: langGraphNode,
                            step: langGraphStep
                          }
                        });
                      }
                      
                      // Para ferramentas, não processar o conteúdo como texto normal
                      continue;
                    } else {
                      // Se era execução de ferramenta e agora voltou ao agent, notificar fim
                      if (currentToolExecution) {
                        onChunk({
                          content: '',
                          type: 'end',
                          meta: { tool_finished: currentToolExecution }
                        });
                        currentToolExecution = null;
                      }
                    }
                    
                    // Extrair conteúdo do AIMessageChunk
                    let textContent = '';
                    if (data.content && typeof data.content === 'object' && data.content.content) {
                      textContent = data.content.content;
                    }
                    
                    // Verificar se terminou (finish_reason)
                    const finishReason = data.content?.response_metadata?.finish_reason;
                    if (finishReason === 'stop') {
                      console.log('LangGraph indicou finish_reason=stop');
                      // Não retornar aqui, processar o último chunk primeiro
                    }
                    
                    // Se há conteúdo de texto, processar
                    if (textContent) {
                      console.log('Token LangGraph recebido:', textContent);
                      fullResponse += textContent;
                      
                      // Notificar o chunk como token
                      onChunk({
                        content: textContent,
                        type: 'token',
                        meta: {
                          node: langGraphNode,
                          step: langGraphStep,
                          finish_reason: finishReason
                        }
                      });
                    }
                    
                    // Se terminou, finalizar
                    if (finishReason === 'stop') {
                      console.log('Finalizando por finish_reason=stop');
                      onComplete(fullResponse);
                      return;
                    }
                  }
                } catch (e) {
                  console.warn('Falha ao processar dados LangGraph:', rawData.substring(0, 100), e);
                  // Se não conseguir fazer parse, tratar como texto simples (fallback)
                  if (rawData.trim() && rawData !== '[DONE]') {
                    fullResponse += rawData;
                    onChunk({
                      content: rawData,
                      type: 'text'
                    });
                  }
                }
              }
            }
            
            return processStream();
          })
          .catch(error => {
            console.error('Erro processando stream LangGraph:', error);
            
            // Se já temos algum conteúdo quando ocorrer o erro, retornar o que temos
            if (fullResponse.trim().length > 0) {
              console.log('Erro durante streaming LangGraph, retornando resposta parcial:', fullResponse.substring(0, 50) + '...');
              onComplete(fullResponse);
            } else {
              onError(error);
            }
          });
        }
        
        return processStream();
      })
      .catch(error => {
        console.error('Erro conectando ao LangGraph:', error);
        onError(error);
      });
  }
};

export default agentService; 