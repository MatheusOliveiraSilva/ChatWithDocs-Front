import axios from 'axios';
import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

// Types
export interface Message {
  role: 'user' | 'assistant';
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

const convertToMessageObjects = (messages: [string, string][]): Message[] => {
  return messages.map(([role, content]) => ({ 
    role: role as 'user' | 'assistant', 
    content 
  }));
};

const conversationService = {
  // Get all conversations for the current user
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const response = await axios.get(`${API_URL}/conversation`, {
        headers: authService.getAuthHeader(),
        withCredentials: true
      });
      
      return response.data.conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Get a specific conversation by thread_id
  getConversation: async (threadId: string): Promise<Conversation> => {
    try {
      const response = await axios.get(`${API_URL}/conversation/${threadId}`, {
        headers: authService.getAuthHeader(),
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversation ${threadId}:`, error);
      throw error;
    }
  },

  // Create a new conversation
  createConversation: async (
    threadId: string,
    threadName: string,
    firstMessage: string
  ): Promise<Conversation> => {
    try {
      const response = await axios.post(
        `${API_URL}/conversation`,
        {
          thread_id: threadId,
          thread_name: threadName,
          first_message_role: 'user',
          first_message_content: firstMessage
        },
        {
          headers: authService.getAuthHeader(),
          withCredentials: true
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Update an existing conversation
  updateConversation: async (
    threadId: string,
    messages: Message[]
  ): Promise<Conversation> => {
    try {
      const messageArray = convertToMessageArray(messages);
      
      const response = await axios.patch(
        `${API_URL}/conversation`,
        {
          thread_id: threadId,
          messages: messageArray
        },
        {
          headers: authService.getAuthHeader(),
          withCredentials: true
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error updating conversation ${threadId}:`, error);
      throw error;
    }
  },

  // Delete a conversation
  deleteConversation: async (threadId: string): Promise<boolean> => {
    try {
      await axios.delete(`${API_URL}/conversation/${threadId}`, {
        headers: authService.getAuthHeader(),
        withCredentials: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting conversation ${threadId}:`, error);
      throw error;
    }
  },

  // Helper to generate a unique thread ID
  generateThreadId: (): string => {
    return `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },

  // Helper to generate a thread name from the first message
  generateThreadName: (firstMessage: string): string => {
    // Limit the length of the thread name
    const maxLength = 30;
    if (firstMessage.length <= maxLength) {
      return firstMessage;
    }
    return firstMessage.substring(0, maxLength) + '...';
  }
};

export default conversationService; 