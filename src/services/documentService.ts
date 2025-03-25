import authService from './authService';

// Tipos para documentos
export interface Document {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  s3_path: string;
  mime_type: string;
  file_size: number;
  is_processed: boolean;
  index_status: string;
  doc_metadata: Record<string, any>;
  created_at: string;
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
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

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
  }
};

export default documentService; 