import authService from './authService';

// Types
export interface Message {
  role: 'user' | 'assistant' | 'thought' | 'system';
  content: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  thread_id: string;
  thread_name: string;
  messages: [string, string][];
  created_at: string;
  last_used: string;
}

// Helper to convert between different message formats
const convertToMessageArray = (messages: Message[]): [string, string][] => {
  return messages.map(msg => [msg.role, msg.content]);
};

// Helper to generate conversation title from message
const generateConversationTitle = (message: string): string => {
  // Simple method to generate a title from the first message
  const words = message.trim().split(' ');
  
  if (words.length <= 4) {
    return message.length > 30 ? message.substring(0, 30) + '...' : message;
  }
  
  return words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
};

// Serviço de conversas adaptado para localStorage (backend não suporta conversas)
const conversationService = {
  // Get all conversations for the current user (localStorage)
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const stored = localStorage.getItem('conversations');
      const conversations: Conversation[] = stored ? JSON.parse(stored) : [];
      
      // Ordenar por last_used descrescente
      conversations.sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime());
      
      return conversations;
    } catch (error) {
      console.error('Error fetching conversations from localStorage:', error);
      return [];
    }
  },

  // Get a specific conversation by thread_id (localStorage)
  getConversation: async (threadId: string): Promise<Conversation> => {
    try {
      const conversations = await conversationService.getConversations();
      const conversation = conversations.find(c => c.thread_id === threadId);
      
      if (!conversation) {
        throw new Error(`Conversation with thread_id ${threadId} not found`);
      }
      
      return conversation;
    } catch (error) {
      console.error(`Error fetching conversation ${threadId}:`, error);
      throw error;
    }
  },

  // Create a new conversation (localStorage)
  createConversation: async (
    threadId: string,
    threadName: string,
    firstMessage: string
  ): Promise<Conversation> => {
    try {
      // Gerar um nome melhor baseado na mensagem
      const finalThreadName = generateConversationTitle(firstMessage) || threadName;
      
      const conversation: Conversation = {
        id: Date.now(), // ID único baseado em timestamp
        user_id: 1, // ID fixo para demo-user
        thread_id: threadId,
        thread_name: finalThreadName,
        messages: [['user', firstMessage]],
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      };
      
      // Salvar no localStorage
      const conversations = await conversationService.getConversations();
      conversations.unshift(conversation); // Adicionar no início
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      console.log('Conversa criada no localStorage:', conversation.thread_id);
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Update an existing conversation (localStorage)
  updateConversation: async (
    threadId: string,
    messages: Message[]
  ): Promise<Conversation> => {
    try {
      const conversations = await conversationService.getConversations();
      const index = conversations.findIndex(c => c.thread_id === threadId);
      
      if (index === -1) {
        throw new Error(`Conversation with thread_id ${threadId} not found for update`);
      }
      
      const messageArray = convertToMessageArray(messages);
      
      // Atualizar a conversa
      conversations[index] = {
        ...conversations[index],
        messages: messageArray,
        last_used: new Date().toISOString()
      };
      
      // Salvar no localStorage
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      console.log('Conversa atualizada no localStorage:', threadId);
      return conversations[index];
    } catch (error) {
      console.error(`Error updating conversation ${threadId}:`, error);
      throw error;
    }
  },

  // Delete a conversation (localStorage)
  deleteConversation: async (threadId: string): Promise<boolean> => {
    try {
      const conversations = await conversationService.getConversations();
      const filteredConversations = conversations.filter(c => c.thread_id !== threadId);
      
      // Salvar a lista filtrada
      localStorage.setItem('conversations', JSON.stringify(filteredConversations));
      
      // Também remover documentos associados
      localStorage.removeItem(`docs_${threadId}`);
      
      console.log('Conversa e recursos associados removidos do localStorage:', threadId);
      return true;
    } catch (error) {
      console.error(`Erro ao excluir conversa ${threadId}:`, error);
      throw error;
    }
  },

  // Helper to generate a unique thread ID
  generateThreadId: (): string => {
    const sessionId = authService.getSessionId() || 'demo';
    const uuid = crypto.randomUUID 
      ? crypto.randomUUID().split('-')[0] // Usar apenas a primeira parte do UUID (8 caracteres)
      : Math.random().toString(36).substring(2, 10); // 8 caracteres alfanuméricos aleatórios
    
    return `${sessionId}-${uuid}`;
  },

  // Helper to generate a thread name from the first message
  generateThreadName: (firstMessage: string): string => {
    const maxLength = 30;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }
    return firstMessage.substring(0, maxLength) + '...';
  },

  // Função para sincronizar com o backend (futura implementação)
  syncWithBackend: async (): Promise<void> => {
    // Esta função poderia ser implementada no futuro para sincronizar
    // as conversas do localStorage com um backend que suporte gestão de conversas
    console.log('Sincronização com backend não implementada - usando apenas localStorage');
  },

  // Função para exportar conversas
  exportConversations: async (): Promise<string> => {
    const conversations = await conversationService.getConversations();
    return JSON.stringify(conversations, null, 2);
  },

  // Função para importar conversas
  importConversations: async (jsonData: string): Promise<void> => {
    try {
      const conversations: Conversation[] = JSON.parse(jsonData);
      localStorage.setItem('conversations', JSON.stringify(conversations));
      console.log('Conversas importadas com sucesso:', conversations.length);
    } catch (error) {
      console.error('Erro ao importar conversas:', error);
      throw new Error('Formato de dados inválido para importação');
    }
  }
};

export default conversationService; 