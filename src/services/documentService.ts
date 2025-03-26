import authService from './authService';

// Tipos para documentos
export interface Document {
  id: number;
  user_id: number;
  thread_id: string;
  conversation_id?: number;
  filename: string;
  original_filename: string;
  s3_path: string;
  mime_type: string;
  file_size: number;
  is_processed: boolean;
  index_status: 'pending' | 'processing' | 'completed' | 'failed';
  doc_metadata: Record<string, any>;
  created_at: string;
  error_message?: string;
}

export interface DocumentDownload {
  download_url: string;
  expires_in: number;
  filename: string;
}

const API_URL = import.meta.env.VITE_API_URL;

// Função auxiliar para fazer requisições autenticadas
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeader = authService.getAuthHeader();
  const headers = {
    ...options.headers as Record<string, string>,
    ...(authHeader.Authorization ? { 'Authorization': authHeader.Authorization } : {})
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// Serviço para gerenciamento de documentos
const documentService = {
  // Upload de documento
  async uploadDocument(file: File, threadId: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('thread_id', threadId);

    const response = await authFetch(`${API_URL}/document/upload`, {
      method: 'POST',
      body: formData,
      // Não incluir Content-Type, o navegador define automaticamente para FormData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer upload do documento');
    }

    return await response.json();
  },

  // Listagem de documentos
  async getDocuments(skip: number = 0, limit: number = 10): Promise<{ documents: Document[], total: number }> {
    const response = await authFetch(`${API_URL}/document?skip=${skip}&limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao buscar documentos');
    }

    return await response.json();
  },

  // Listar documentos de uma conversa específica
  async getConversationDocuments(threadId: string): Promise<{ documents: Document[], total: number }> {
    const response = await authFetch(`${API_URL}/document/conversation/${threadId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao buscar documentos da conversa');
    }

    return await response.json();
  },

  // Detalhes de um documento específico
  async getDocument(documentId: number): Promise<Document> {
    const response = await authFetch(`${API_URL}/document/${documentId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao buscar detalhes do documento');
    }

    return await response.json();
  },

  // Download de documento
  async getDocumentDownloadUrl(documentId: number): Promise<DocumentDownload> {
    const response = await authFetch(`${API_URL}/document/${documentId}/download`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao gerar URL de download');
    }

    return await response.json();
  },

  // Exclusão de documento
  async deleteDocument(documentId: number): Promise<void> {
    const response = await authFetch(`${API_URL}/document/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao excluir documento');
    }
  },

  // Iniciar processamento de um documento
  async processDocument(documentId: number): Promise<{ status: string, message: string }> {
    const response = await authFetch(`${API_URL}/ingestion/${documentId}/process`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao iniciar processamento do documento');
    }

    return await response.json();
  },

  // Processar todos os documentos de uma thread
  async processThreadDocuments(threadId: string): Promise<{ status: string, message: string }> {
    const response = await authFetch(`${API_URL}/ingestion/thread/${threadId}/process`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao processar documentos da thread');
    }

    return await response.json();
  },

  // Remover documento do índice
  async removeFromIndex(documentId: number): Promise<void> {
    const response = await authFetch(`${API_URL}/ingestion/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao remover documento do índice');
    }
  },

  // Obter progresso de indexação de um documento
  async getDocumentProgress(documentId: number): Promise<{
    progress: number;
    chunks_indexed: number;
    total_chunks: number;
    status: string;
  }> {
    const response = await authFetch(`${API_URL}/ingestion/${documentId}/progress`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao obter progresso de indexação');
    }

    const data = await response.json();
    return {
      progress: data.progress || 0,
      chunks_indexed: data.chunks_indexed || 0,
      total_chunks: data.total_chunks || 0,
      status: data.status || 'unknown'
    };
  },

  // Status para exibição em formato textual
  getStatusDisplay(status: string): { text: string, icon: string } {
    switch (status) {
      case 'pending':
        return { text: 'Pendente', icon: '⏳' };
      case 'processing':
        return { text: 'Processando', icon: '🔄' };
      case 'completed':
        return { text: 'Concluído', icon: '✅' };
      case 'failed':
        return { text: 'Falha', icon: '❌' };
      default:
        return { text: 'Desconhecido', icon: '❓' };
    }
  }
};

export default documentService; 