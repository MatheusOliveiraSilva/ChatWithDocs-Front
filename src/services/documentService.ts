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

// Novos tipos para a nova API
export interface DocumentMetadata {
  title: string;
  content?: string;
  source?: string;
  author?: string;
  tags?: string[];
  thread_id?: string;
  filename?: string;
  uploaded_at?: string;
  [key: string]: any;
}

export interface UploadDocumentRequest {
  document: DocumentMetadata;
  vector: number[];
  namespace?: string;
  document_id?: string;
}

export interface DocumentResponse {
  success: boolean;
  message: string;
  document_id: string;
  vectors_created?: number;
  processing_time?: number;
  metadata?: Record<string, any>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Função utilitária para gerar vetores dummy mais realistas
const generateDummyVector = (text: string, dimension: number = 3072): number[] => {
  // Usar o hash do texto para gerar um vetor mais consistente
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Gerar vetor baseado no hash para consistência
  const vector = [];
  for (let i = 0; i < dimension; i++) {
    // Usar o hash como seed para gerar valores consistentes
    const seed = (hash + i) * 0.00001;
    vector.push(Math.sin(seed) * 0.1);
  }
  
  return vector;
};

// Serviço atualizado para a nova API
const documentService = {
  // Upload de documento via arquivo (adaptado para usar endpoint /upload)
  async uploadDocument(file: File, threadId: string): Promise<Document> {
    // Como a API atual não processa arquivos diretamente, vamos simular
    // o processamento local e usar o endpoint /upload com metadados
    
    // Ler o conteúdo do arquivo como texto (para arquivos de texto)
    let content = '';
    try {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await file.text();
      } else {
        // Para outros tipos de arquivo, usar o nome como conteúdo temporário
        content = `Arquivo: ${file.name} (${file.type}) - ${file.size} bytes`;
      }
    } catch (error) {
      console.warn('Erro ao ler conteúdo do arquivo, usando metadados:', error);
      content = `Arquivo: ${file.name} (${file.type}) - ${file.size} bytes`;
    }
    
    // Gerar um vetor dummy (em produção, isso seria feito pelo backend)
    const dummyVector = generateDummyVector(content);
    
    const requestBody: UploadDocumentRequest = {
      document: {
        title: file.name.split('.')[0],
        content: content,
        source: 'file_upload',
        thread_id: threadId,
        filename: file.name,
        uploaded_at: new Date().toISOString(),
        tags: ['file', 'upload'],
        mime_type: file.type,
        file_size: file.size
      },
      vector: dummyVector,
      namespace: `thread_${threadId}`,
      document_id: `file_${Date.now()}_${threadId}`
    };

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer upload do documento');
    }

    const result: DocumentResponse = await response.json();
    
    // Adaptar resposta para o formato esperado pelo frontend
    const document: Document = {
      document_id: result.document_id,
      vectors_created: 1, // Simulado
      processing_time: 0, // Simulado
      filename: file.name,
      original_filename: file.name,
      s3_path: `uploads/${file.name}`,
      mime_type: file.type,
      file_size: file.size,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: { 
        indexing_progress: 100,
        chunks_indexed: 1,
        total_chunks: 1,
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

  // Upload de texto diretamente (usando endpoint /upload)
  async uploadText(content: string, threadId: string, title?: string): Promise<Document> {
    const documentTitle = title || 'Text Document';
    
    // Gerar um vetor dummy (em produção, isso seria feito pelo backend)
    const dummyVector = generateDummyVector(content);
    
    const requestBody: UploadDocumentRequest = {
      document: {
        title: documentTitle,
        content: content,
        source: 'text_upload',
        thread_id: threadId,
        uploaded_at: new Date().toISOString(),
        tags: ['text', 'manual_upload']
      },
      vector: dummyVector,
      namespace: `thread_${threadId}`,
      document_id: `text_${Date.now()}_${threadId}`
    };

    const response = await fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer upload do texto');
    }

    const result: DocumentResponse = await response.json();
    
    const document: Document = {
      document_id: result.document_id,
      vectors_created: 1, // Simulado
      processing_time: 0, // Simulado
      filename: `${documentTitle}.txt`,
      original_filename: `${documentTitle}.txt`,
      s3_path: `uploads/${documentTitle}.txt`,
      mime_type: 'text/plain',
      file_size: content.length,
      is_processed: true,
      index_status: 'completed' as const,
      doc_metadata: { 
        indexing_progress: 100,
        chunks_indexed: 1,
        total_chunks: 1,
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

  // Documentos de uma conversa (simulado)
  async getConversationDocuments(threadId: string): Promise<{ documents: Document[], total: number }> {
    // Backend não suporta listagem por thread_id
    // Precisaria implementar storage local ou adaptar backend
    const storedDocs = this.getStoredDocuments(threadId);
    return { documents: storedDocs, total: storedDocs.length };
  },

  // Estatísticas dos documentos (usando nova API)
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await fetch(`${API_URL}/documents/stats`);

    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas');
    }

    const result = await response.json();
    
    // Adaptar resposta da nova API para o formato esperado
    // A API retorna { success: true, stats: { ... } }
    const stats = result.stats || {};
    
    return {
      total_vectors: stats.total_vectors || 0,
      dimension: stats.dimension || 3072,
      index_fullness: stats.index_fullness || 0
    };
  },

  // Deletar documentos por IDs (usando nova API)
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
      const error = await response.json();
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

  // Funções de compatibilidade (adaptadas para nova API)
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

    // Deletar no backend usando o document_id e namespace correto
    try {
      await this.deleteDocuments([foundDocument.document_id], `thread_${foundThreadId}`);
    } catch (error) {
      console.warn('Erro ao deletar no backend, removendo apenas do localStorage:', error);
      // Remover do localStorage mesmo se falhar no backend
      this.removeStoredDocument(foundThreadId, foundDocument.document_id);
    }
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
  },

  // Busca por similaridade (novo método usando nova API)
  async searchDocuments(_query: string, _threadId?: string, _topK: number = 5): Promise<any[]> {
    // Este método requer que o backend tenha um endpoint para converter texto em vetor
    // Por enquanto, retornamos array vazio ou implementamos busca local
    console.warn('Busca por similaridade requer implementação de embedding no backend');
    return [];
  },

  // Limpar namespace (novo método usando nova API)
  async clearNamespace(namespace: string): Promise<void> {
    const response = await fetch(`${API_URL}/documents/clear-namespace?namespace=${encodeURIComponent(namespace)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao limpar namespace');
    }

    // Limpar localStorage correspondente
    if (namespace.startsWith('thread_')) {
      const threadId = namespace.replace('thread_', '');
      localStorage.removeItem(`docs_${threadId}`);
    }
  }
};

export default documentService; 