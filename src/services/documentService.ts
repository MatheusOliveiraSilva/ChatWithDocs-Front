// Tipos adaptados para o novo backend (mantendo compatibilidade)
export interface Document {
  document_id: string;
  vectors_created?: number;
  processing_time?: number;
  // Campos para compatibilidade com componentes existentes
  id: number;
  user_id: number;
  thread_id: string;
  conversation_id?: number;
  filename: string;
  original_filename: string; // Igual ao filename
  s3_path?: string;
  mime_type?: string;
  file_size?: number;
  is_processed: boolean;
  index_status: 'pending' | 'processing' | 'completed' | 'failed';
  doc_metadata: Record<string, any>;
  created_at: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface DocumentStats {
  total_vectors: number;
  dimension: number;
  index_fullness: number;
}

// Interfaces simplificadas para upload de arquivo bruto
export interface FileUploadResponse {
  success: boolean;
  message: string;
  document_id: string;
  total_chunks?: number;
  vectors_created?: number;
  processing_time?: number;
  filename?: string;
  mime_type?: string;
  file_size?: number;
  metadata?: Record<string, any>;
}

// Interface para upload de texto (mantida para compatibilidade)
export interface TextUploadRequest {
  document: {
    title: string;
    content: string;
    source?: string;
    tags?: string[];
  };
  namespace?: string;
  document_id?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Serviço refatorado - Frontend envia arquivo bruto, Backend faz toda a inteligência
const documentService = {
  // Upload de arquivo - MUITO MAIS SIMPLES! 🎉
  async uploadDocument(file: File, threadId: string): Promise<Document> {
    // Criar FormData com apenas o arquivo e namespace
    const formData = new FormData();
    formData.append('file', file);
    formData.append('namespace', `thread_${threadId}`);
    
    // Opcional: ID customizado para o documento
    const documentId = `file_${Date.now()}_${threadId}`;
    formData.append('document_id', documentId);

    const response = await fetch(`${API_URL}/documents/upload-file`, {
      method: 'POST',
      body: formData, // Sem Content-Type - deixar o browser definir boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || 'Erro ao fazer upload do documento');
    }

    const result: FileUploadResponse = await response.json();
    
    // Adaptar resposta para o formato esperado pelo frontend
    const document: Document = {
      document_id: result.document_id,
      vectors_created: result.total_chunks || result.vectors_created || 1,
      processing_time: result.processing_time || 0,
      filename: result.filename || file.name,
      original_filename: result.filename || file.name,
      s3_path: `uploads/${result.filename || file.name}`,
      mime_type: result.mime_type || file.type,
      file_size: result.file_size || file.size,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: { 
        indexing_progress: 100,
        chunks_indexed: result.total_chunks || 1,
        total_chunks: result.total_chunks || 1,
        ...result.metadata
      },
      created_at: new Date().toISOString(),
      error_message: undefined,
      metadata: { thread_id: threadId },
      // Campos simulados para compatibilidade
      id: Date.now(),
      user_id: 1,
      thread_id: threadId,
      conversation_id: undefined
    };

    // Armazenar documento no localStorage
    this.storeDocument(document);

    return document;
  },

  // Upload de texto diretamente (mantido para compatibilidade)
  async uploadText(content: string, threadId: string, title?: string): Promise<Document> {
    const documentTitle = title || 'Text Document';
    
    const requestBody: TextUploadRequest = {
      document: {
        title: documentTitle,
        content: content,
        source: 'text_upload',
        tags: ['text', 'manual_upload']
      },
      namespace: `thread_${threadId}`,
      document_id: `text_${Date.now()}_${threadId}`
    };

    const response = await fetch(`${API_URL}/documents/upload-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || 'Erro ao fazer upload do texto');
    }

    const result: FileUploadResponse = await response.json();
    
    const document: Document = {
      document_id: result.document_id,
      vectors_created: result.total_chunks || result.vectors_created || 1,
      processing_time: result.processing_time || 0,
      filename: `${documentTitle}.txt`,
      original_filename: `${documentTitle}.txt`,
      s3_path: `uploads/${documentTitle}.txt`,
      mime_type: 'text/plain',
      file_size: content.length,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: { 
        indexing_progress: 100,
        chunks_indexed: result.total_chunks || 1,
        total_chunks: result.total_chunks || 1,
        ...result.metadata
      },
      created_at: new Date().toISOString(),
      error_message: undefined,
      metadata: { thread_id: threadId },
      // Campos simulados para compatibilidade
      id: Date.now(),
      user_id: 1,
      thread_id: threadId,
      conversation_id: undefined
    };

    // Armazenar documento no localStorage
    this.storeDocument(document);

    return document;
  },

  // Listar documentos (simulado - backend não tem esse endpoint)
  async getDocuments(): Promise<{ documents: Document[], total: number }> {
    // Como o backend não tem endpoint para listar documentos,
    // retornamos dados vazios ou simulados
    return { documents: [], total: 0 };
  },

  // Documentos de uma conversa (usando localStorage)
  async getConversationDocuments(threadId: string): Promise<{ documents: Document[], total: number }> {
    const storedDocs = this.getStoredDocuments(threadId);
    return { documents: storedDocs, total: storedDocs.length };
  },

  // Estatísticas dos documentos
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await fetch(`${API_URL}/documents/stats`);

    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas');
    }

    const result = await response.json();
    const stats = result.stats || {};
    
    return {
      total_vectors: stats.total_vectors || 0,
      dimension: stats.dimension || 3072,
      index_fullness: stats.index_fullness || 0
    };
  },

  // Deletar documentos por IDs
  async deleteDocuments(documentIds: string[], namespace?: string): Promise<void> {
    const response = await fetch(`${API_URL}/documents/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        document_ids: documentIds,
        namespace: namespace || 'default'
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || 'Erro ao excluir documentos');
    }

    // Remover documentos do localStorage também
    const allThreads = this.getAllStoredThreads();
    for (const threadId of allThreads) {
      for (const docId of documentIds) {
        this.removeStoredDocument(threadId, docId);
      }
    }
  },

  // Deletar documento individual (compatibilidade)
  async deleteDocument(documentId: number): Promise<void> {
    const allThreads = this.getAllStoredThreads();
    let foundDocument: Document | null = null;
    let foundThreadId: string | null = null;

    for (const threadId of allThreads) {
      const docs = this.getStoredDocuments(threadId);
      const doc = docs.find(d => d.id === documentId);
      if (doc) {
        foundDocument = doc;
        foundThreadId = threadId;
        break;
      }
    }

    if (!foundDocument || !foundThreadId) {
      throw new Error(`Documento com ID ${documentId} não encontrado`);
    }

    try {
      await this.deleteDocuments([foundDocument.document_id], `thread_${foundThreadId}`);
    } catch (error) {
      console.warn('Erro ao deletar no backend, removendo apenas do localStorage:', error);
      this.removeStoredDocument(foundThreadId, foundDocument.document_id);
    }
  },

  // Busca por similaridade
  async searchDocuments(query: string, threadId?: string, topK: number = 5): Promise<any[]> {
    const response = await fetch(`${API_URL}/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        namespace: threadId ? `thread_${threadId}` : undefined,
        top_k: topK
      }),
    });

    if (!response.ok) {
      console.warn('Busca por similaridade falhou, retornando array vazio');
      return [];
    }

    const result = await response.json();
    return result.documents || [];
  },

  // Limpar namespace
  async clearNamespace(namespace: string): Promise<void> {
    const response = await fetch(`${API_URL}/documents/clear-namespace?namespace=${encodeURIComponent(namespace)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || 'Erro ao limpar namespace');
    }

    // Limpar localStorage correspondente
    if (namespace.startsWith('thread_')) {
      const threadId = namespace.replace('thread_', '');
      localStorage.removeItem(`docs_${threadId}`);
    }
  },

  // === MÉTODOS DE COMPATIBILIDADE ===
  async processDocument(_documentId?: number): Promise<{ status: string, message: string }> {
    return { status: 'completed', message: 'Processamento automático no upload' };
  },

  async getDocumentProgress(_documentId?: number): Promise<any> {
    return { progress: 100, status: 'completed', chunks_indexed: 0, total_chunks: 0 };
  },

  async getDocument(documentId: number): Promise<Document> {
    const allThreads = this.getAllStoredThreads();
    
    for (const threadId of allThreads) {
      const docs = this.getStoredDocuments(threadId);
      const doc = docs.find(d => d.id === documentId);
      if (doc) return doc;
    }
    
    throw new Error(`Documento com ID ${documentId} não encontrado`);
  },

  async removeFromIndex(documentId: number): Promise<void> {
    await this.deleteDocument(documentId);
  },

  getStatusDisplay(_status: string): { text: string, icon: string } {
    return { text: 'Concluído', icon: '✅' };
  },

  // === MÉTODOS DE STORAGE LOCAL ===
  getStoredDocuments(threadId: string): Document[] {
    const stored = localStorage.getItem(`docs_${threadId}`);
    return stored ? JSON.parse(stored) : [];
  },

  storeDocument(document: Document): void {
    const threadId = document.thread_id;
    const existing = this.getStoredDocuments(threadId);
    existing.push(document);
    localStorage.setItem(`docs_${threadId}`, JSON.stringify(existing));
  },

  removeStoredDocument(threadId: string, documentId: string): void {
    const existing = this.getStoredDocuments(threadId);
    const filtered = existing.filter(doc => doc.document_id !== documentId);
    localStorage.setItem(`docs_${threadId}`, JSON.stringify(filtered));
  },

  getAllStoredThreads(): string[] {
    const threads = Object.keys(localStorage).filter(key => key.startsWith('docs_'));
    return threads.map(key => key.split('_')[1]);
  }
};

export default documentService; 