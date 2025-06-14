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

const API_URL = import.meta.env.VITE_API_URL;

// Serviço adaptado para o novo backend
const documentService = {
  // Upload de documento via arquivo
  async uploadDocument(file: File, threadId: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      thread_id: threadId,
      filename: file.name,
      uploaded_at: new Date().toISOString()
    }));

    const response = await fetch(`${API_URL}/documents/upload-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer upload do documento');
    }

    const result = await response.json();
    
    // Adaptar resposta para o formato esperado pelo frontend
    const document: Document = {
      document_id: result.document_id,
      vectors_created: result.vectors_created,
      processing_time: result.processing_time,
      filename: file.name,
      original_filename: file.name,
      s3_path: result.s3_path || `uploads/${file.name}`,
      mime_type: file.type,
      file_size: file.size,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: result.doc_metadata || { 
        indexing_progress: 100,
        chunks_indexed: result.vectors_created || 1,
        total_chunks: result.vectors_created || 1
      },
      created_at: new Date().toISOString(),
      error_message: result.error_message,
      metadata: { thread_id: threadId },
      // Campos simulados
      id: Date.now(), // ID temporário
      user_id: 1, // ID fixo do demo-user
      thread_id: threadId,
      conversation_id: result.conversation_id
    };

    // Armazenar documento no localStorage
    this.storeDocument(document);

    return document;
  },

  // Upload de texto diretamente
  async uploadText(content: string, threadId: string, title?: string): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        metadata: {
          thread_id: threadId,
          title: title || 'Text Document',
          uploaded_at: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer upload do texto');
    }

    const result = await response.json();
    
    const document: Document = {
      document_id: result.document_id,
      vectors_created: result.vectors_created,
      processing_time: result.processing_time,
      filename: title || 'text-document.txt',
      original_filename: title || 'text-document.txt',
      s3_path: result.s3_path || `uploads/${title || 'text-document.txt'}`,
      mime_type: 'text/plain',
      file_size: content.length,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: result.doc_metadata || { 
        indexing_progress: 100,
        chunks_indexed: result.vectors_created || 1,
        total_chunks: result.vectors_created || 1
      },
      created_at: new Date().toISOString(),
      error_message: result.error_message,
      metadata: { thread_id: threadId },
      // Campos simulados
      id: Date.now(),
      user_id: 1,
      thread_id: threadId,
      conversation_id: result.conversation_id
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

  // Documentos de uma conversa (simulado)
  async getConversationDocuments(threadId: string): Promise<{ documents: Document[], total: number }> {
    // Backend não suporta listagem por thread_id
    // Precisaria implementar storage local ou adaptar backend
    const storedDocs = this.getStoredDocuments(threadId);
    return { documents: storedDocs, total: storedDocs.length };
  },

  // Estatísticas dos documentos
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await fetch(`${API_URL}/documents/stats`);

    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas');
    }

    return await response.json();
  },

  // Deletar documentos por IDs
  async deleteDocuments(documentIds: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/documents/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_ids: documentIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao excluir documentos');
    }
  },

  // Funções de compatibilidade (não suportadas pelo backend)
  async deleteDocument(documentId: number): Promise<void> {
    // Encontrar o documento no localStorage por ID numérico
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

    // Tentar deletar no backend usando o document_id
    try {
      await this.deleteDocuments([foundDocument.document_id]);
    } catch (error) {
      console.warn('Erro ao deletar no backend, removendo apenas do localStorage:', error);
    }

    // Remover do localStorage
    this.removeStoredDocument(foundThreadId, foundDocument.document_id);
  },

  async processDocument(_documentId?: number): Promise<{ status: string, message: string }> {
    // Backend processa automaticamente no upload
    return { status: 'completed', message: 'Processamento automático no upload' };
  },

  async getDocumentProgress(_documentId?: number): Promise<any> {
    // Backend não tem progresso - processamento é instantâneo
    return { progress: 100, status: 'completed', chunks_indexed: 0, total_chunks: 0 };
  },

  async getDocument(documentId: number): Promise<Document> {
    // Buscar documento no localStorage por ID
    const allThreads = this.getAllStoredThreads();
    
    for (const threadId of allThreads) {
      const docs = this.getStoredDocuments(threadId);
      const doc = docs.find(d => d.id === documentId);
      if (doc) {
        return doc;
      }
    }
    
    throw new Error(`Documento com ID ${documentId} não encontrado`);
  },

  async removeFromIndex(documentId: number): Promise<void> {
    // Para compatibilidade - mesmo comportamento que deleteDocument
    await this.deleteDocument(documentId);
  },

  // Storage local para simular gestão de documentos por thread
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

  // Função auxiliar para status
  getStatusDisplay(_status: string): { text: string, icon: string } {
    return { text: 'Concluído', icon: '✅' }; // Sempre concluído no novo backend
  },

  getAllStoredThreads(): string[] {
    const threads = Object.keys(localStorage).filter(key => key.startsWith('docs_'));
    return threads.map(key => key.split('_')[1]);
  }
};

export default documentService; 