import { useState, useRef, useEffect } from 'react';
import documentService, { Document } from '../services/documentService';
import DocumentStatusBadge from './DocumentStatusBadge';
import DocumentActionMenu from './DocumentActionMenu';
import '../styles/DocumentUpload.css';

// Interface para o item de upload
interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  documentId?: number;
}

// Interface para polling de status
interface PollingStatus {
  [key: number]: NodeJS.Timeout;
}

// Props do componente
interface DocumentUploadProps {
  onDocumentUploaded?: (document: Document) => void;
  threadId: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentUploaded, threadId }) => {
  const [isDropzoneOpen, setIsDropzoneOpen] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDocumentListExpanded, setIsDocumentListExpanded] = useState(false);
  const [pollingIntervals, setPollingIntervals] = useState<PollingStatus>({});
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Efeito para limpeza de intervalos ao desmontar
  useEffect(() => {
    return () => {
      // Limpar todos os intervalos de polling ao desmontar
      Object.values(pollingIntervals).forEach(clearInterval);
    };
  }, [pollingIntervals]);

  // Efeito para adicionar/remover eventos de arrastar e soltar globais
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDropping(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Verifica se o cursor saiu da janela
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setIsDropping(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDropping(false);
      
      // Se o dropzone não estiver aberto, abra-o
      if (!isDropzoneOpen) {
        setIsDropzoneOpen(true);
      }
      
      // Processa os arquivos, se houver
      if (e.dataTransfer?.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    };

    // Adiciona eventos ao documento
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      // Remove eventos ao desmontar
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isDropzoneOpen]);

  // Buscar documentos enviados quando o componente montar ou threadId mudar
  useEffect(() => {
    fetchUploadedDocuments();
    
    // Limpar dados quando threadId muda
    setUploadItems([]);
    
    // Limpar todos os intervalos existentes
    Object.values(pollingIntervals).forEach(clearInterval);
    setPollingIntervals({});
  }, [threadId]);

  // Função para buscar documentos já enviados
  const fetchUploadedDocuments = async () => {
    try {
      setIsLoading(true);
      if (!threadId) {
        setUploadedDocuments([]);
        setIsLoading(false);
        return;
      }
      
      console.log(`Buscando documentos para thread_id: ${threadId}`);
      const response = await documentService.getConversationDocuments(threadId);
      console.log(`Documentos encontrados:`, response.documents.length);
      setUploadedDocuments(response.documents);
      
      // Iniciar polling para documentos em processamento
      response.documents.forEach(doc => {
        if (doc.index_status === 'processing') {
          startDocumentStatusPolling(doc.id);
        }
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setUploadedDocuments([]);
      setIsLoading(false);
    }
  };

  // Função para abrir o dropzone
  const openDropzone = () => {
    setIsDropzoneOpen(true);
    // Atualiza a lista de documentos quando o modal é aberto
    fetchUploadedDocuments();
  };

  // Função para fechar o dropzone
  const closeDropzone = () => {
    setIsDropzoneOpen(false);
    // Limpa os uploads que já foram concluídos ou que estão com erro
    setUploadItems(items => items.filter(item => item.status === 'uploading'));
  };

  // Função para abrir o seletor de arquivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Função para processar os arquivos selecionados
  const handleFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    console.log(`Processando ${files.length} arquivos para upload`);
    
    // Filtra arquivos muito grandes (limite de 50MB)
    const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    
    // Adiciona avisos para arquivos muito grandes
    if (oversizedFiles.length > 0) {
      const errorMessage = `${oversizedFiles.length} file(s) exceed the 50MB limit and will not be uploaded.`;
      alert(errorMessage);
    }
    
    // Verifica se algum arquivo já está na lista de uploads ativos
    const newFilesToUpload = validFiles.filter(newFile => {
      const isDuplicate = uploadItems.some(item => 
        item.file.name === newFile.name && 
        item.file.size === newFile.size &&
        (item.status === 'uploading' || item.status === 'pending')
      );
      
      if (isDuplicate) {
        console.log(`Arquivo duplicado detectado e ignorado: ${newFile.name}`);
      }
      return !isDuplicate;
    });
    
    console.log(`Arquivos válidos para upload: ${newFilesToUpload.length}`);
    
    if (newFilesToUpload.length === 0) {
      return; // Não há novos arquivos para upload
    }
    
    // Cria novos itens de upload
    const newUploadItems = newFilesToUpload.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const
    }));
    
    // Adiciona à lista de uploads
    setUploadItems(prevItems => [...prevItems, ...newUploadItems]);
    
    // Inicia o upload automaticamente, um de cada vez
    newUploadItems.forEach(item => {
      console.log(`Iniciando upload para: ${item.file.name}`);
      uploadFile(item);
    });
  };

  // Função para iniciar o monitoramento de status de um documento
  const startDocumentStatusPolling = (documentId: number) => {
    // Limpa o intervalo existente, se houver
    if (pollingIntervals[documentId]) {
      clearInterval(pollingIntervals[documentId]);
    }
    
    console.log(`Iniciando polling para documento ID: ${documentId}`);
    
    const interval = setInterval(async () => {
      try {
        const updatedDocument = await documentService.getDocument(documentId);
        console.log(`Documento ${documentId} status: ${updatedDocument.index_status}`);
        
        // Atualizar o documento na lista
        setUploadedDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === documentId ? updatedDocument : doc
          )
        );
        
        // Parar polling quando atingir estado terminal
        if (updatedDocument.index_status === 'completed' || updatedDocument.index_status === 'failed') {
          clearInterval(interval);
          setPollingIntervals(prev => {
            const updated = { ...prev };
            delete updated[documentId];
            return updated;
          });
          
          console.log(`Polling finalizado para documento ${documentId} com status: ${updatedDocument.index_status}`);
        }
      } catch (error) {
        console.error(`Erro ao verificar status do documento ${documentId}:`, error);
        clearInterval(interval);
        setPollingIntervals(prev => {
          const updated = { ...prev };
          delete updated[documentId];
          return updated;
        });
      }
    }, 3000); // Verificar a cada 3 segundos
    
    // Armazenar referência para limpeza
    setPollingIntervals(prev => ({ ...prev, [documentId]: interval }));
  };

  // Função para fazer o upload de um arquivo
  const uploadFile = async (item: UploadItem) => {
    // Defina progressInterval no escopo externo da função e inicialize como undefined
    let progressInterval: NodeJS.Timeout | undefined = undefined;
    
    try {
      // Atualiza o status para 'uploading'
      setUploadItems(items =>
        items.map(i => (i.id === item.id ? { ...i, status: 'uploading' as const } : i))
      );
      
      // Simula o progresso (já que a API não fornece feedback de progresso)
      progressInterval = setInterval(() => {
        setUploadItems(items =>
          items.map(i => {
            if (i.id === item.id && i.progress < 90) {
              return { ...i, progress: i.progress + 10 };
            }
            return i;
          })
        );
      }, 300);
      
      console.log(`Enviando arquivo para API: ${item.file.name}, threadId: ${threadId}`);
      
      try {
        // Envia o arquivo para a API com o thread_id
        const response = await documentService.uploadDocument(item.file, threadId);
        
        // Limpa o intervalo de progresso
        if (progressInterval) clearInterval(progressInterval);
        
        console.log(`Upload bem-sucedido para: ${item.file.name}, id: ${response.id}`);
        
        // Atualiza o status para 'success'
        setUploadItems(items =>
          items.map(i =>
            i.id === item.id
              ? { ...i, progress: 100, status: 'success' as const, documentId: response.id }
              : i
          )
        );
        
        // Atualiza a lista de documentos enviados
        fetchUploadedDocuments();
        
        // Iniciar processamento automaticamente
        try {
          console.log(`Iniciando processamento automático para documento ${response.id}`);
          await documentService.processDocument(response.id);
          
          // Iniciar monitoramento do status
          startDocumentStatusPolling(response.id);
        } catch (processingError) {
          console.error(`Erro ao iniciar processamento do documento ${response.id}:`, processingError);
        }
        
        // Notifica o componente pai
        if (onDocumentUploaded) {
          onDocumentUploaded(response);
        }
      } catch (error) {
        // Captura erros específicos da API
        console.error(`Erro durante upload para API: ${item.file.name}`, error);
        throw error;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Limpa qualquer intervalo de progresso que possa existir
      if (progressInterval) clearInterval(progressInterval);
      
      // Atualiza o status para 'error'
      setUploadItems(items =>
        items.map(i =>
          i.id === item.id
            ? {
                ...i,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : i
        )
      );
    }
  };

  // Funções para manipular documentos
  const handleProcessDocument = async (documentId: number) => {
    try {
      await documentService.processDocument(documentId);
      
      // Atualizar o status do documento para 'processing'
      setUploadedDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId 
            ? { ...doc, index_status: 'processing' } 
            : doc
        )
      );
      
      // Iniciar monitoramento de status
      startDocumentStatusPolling(documentId);
    } catch (error) {
      console.error(`Erro ao processar documento ${documentId}:`, error);
      // Mostrar erro ao usuário
      alert('Erro ao processar documento. Por favor, tente novamente.');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      // Primeiro tentar remover do índice, se aplicável
      if (window.confirm('Também deseja remover este documento do índice de busca?')) {
        try {
          await documentService.removeFromIndex(documentId);
        } catch (indexError) {
          console.error(`Erro ao remover documento ${documentId} do índice:`, indexError);
          // Não bloquear a exclusão do documento se a remoção do índice falhar
        }
      }
      
      // Excluir o documento
      await documentService.deleteDocument(documentId);
      
      // Remover da lista local
      setUploadedDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      
      // Limpar polling se existir
      if (pollingIntervals[documentId]) {
        clearInterval(pollingIntervals[documentId]);
        setPollingIntervals(prev => {
          const updated = { ...prev };
          delete updated[documentId];
          return updated;
        });
      }
    } catch (error) {
      console.error(`Erro ao excluir documento ${documentId}:`, error);
      alert('Erro ao excluir documento. Por favor, tente novamente.');
    }
  };

  const handleViewDetails = (documentId: number) => {
    setSelectedDocumentId(documentId);
    // Aqui você pode implementar a abertura de um modal para detalhes
    console.log(`Visualizar detalhes do documento ${documentId}`);
  };

  const handleDownloadDocument = async (documentId: number) => {
    try {
      const downloadInfo = await documentService.getDocumentDownloadUrl(documentId);
      
      // Abrir URL em nova aba
      window.open(downloadInfo.download_url, '_blank');
    } catch (error) {
      console.error(`Erro ao obter URL de download para documento ${documentId}:`, error);
      alert('Erro ao gerar link de download. Por favor, tente novamente.');
    }
  };

  const handleProcessAllDocuments = async () => {
    if (!threadId || uploadedDocuments.length === 0) return;
    
    try {
      // Iniciar processamento em lote
      await documentService.processThreadDocuments(threadId);
      
      // Atualizar status de documentos pendentes ou com falha
      setUploadedDocuments(prevDocs => 
        prevDocs.map(doc => 
          (doc.index_status === 'pending' || doc.index_status === 'failed')
            ? { ...doc, index_status: 'processing' }
            : doc
        )
      );
      
      // Iniciar polling para todos os documentos em processamento
      uploadedDocuments.forEach(doc => {
        if (doc.index_status === 'pending' || doc.index_status === 'failed') {
          startDocumentStatusPolling(doc.id);
        }
      });
    } catch (error) {
      console.error(`Erro ao processar todos os documentos da thread ${threadId}:`, error);
      alert('Erro ao iniciar processamento em lote. Por favor, tente novamente.');
    }
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para formatar a data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Botão de upload */}
      <div className="document-upload-wrapper">
        <button
          className="document-upload-btn"
          onClick={openDropzone}
          title="Upload document"
          aria-label="Upload document"
        >
          <svg 
            className="document-upload-icon" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
      </div>

      {/* Input de arquivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Overlay de fundo quando o dropzone está aberto */}
      {isDropzoneOpen && <div className="document-overlay" onClick={closeDropzone} />}

      {/* Modal do dropzone */}
      {isDropzoneOpen && (
        <div className="document-dropzone" ref={dropzoneRef}>
          <div className="document-dropzone-header">
            <h3 className="document-dropzone-title">Upload Documents</h3>
            <button className="document-dropzone-close" onClick={closeDropzone}>
              ×
            </button>
          </div>

          {/* Área de arrastar e soltar */}
          <div
            className={`document-dropzone-area ${isDropping ? 'active' : ''}`}
            onClick={openFileSelector}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropping(true);
            }}
            onDragLeave={() => setIsDropping(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropping(false);
              if (e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
              }
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>
              Drag and drop files here or <strong>click to select</strong>
              <br />
              <small>(Maximum size: 50MB per file)</small>
            </p>
          </div>

          {/* Lista de uploads em progresso */}
          {uploadItems.length > 0 && (
            <div className="document-upload-list">
              <h4 className="document-section-title">Current Uploads</h4>
              {uploadItems.map((item) => (
                <div key={item.id} className="document-upload-item">
                  <div className="document-upload-item-name">
                    {item.file.name} ({formatFileSize(item.file.size)})
                  </div>
                  <div className="document-upload-progress">
                    <div
                      className="document-upload-progress-bar"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  {item.status === 'error' && (
                    <div className="document-upload-error">{item.error}</div>
                  )}
                  {item.status === 'success' && (
                    <div className="document-upload-success">Upload completed!</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lista expandível de documentos já enviados */}
          {uploadedDocuments.length > 0 && (
            <div className="document-upload-list">
              <div className="document-section-header">
                <h4 
                  className="document-section-title document-section-expandable"
                  onClick={() => setIsDocumentListExpanded(!isDocumentListExpanded)}
                >
                  Uploaded Documents
                  <svg 
                    className={`document-expand-icon ${isDocumentListExpanded ? 'expanded' : ''}`}
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </h4>
                
                {/* Botão para processar todos os documentos */}
                {uploadedDocuments.some(doc => doc.index_status === 'pending' || doc.index_status === 'failed') && (
                  <button 
                    className="document-process-all-button"
                    onClick={handleProcessAllDocuments}
                    title="Processar todos os documentos pendentes"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Processar Todos
                  </button>
                )}
              </div>
              
              {isDocumentListExpanded && (
                <div className="document-list-content">
                  {uploadedDocuments.map((doc) => (
                    <div key={doc.id} className="document-upload-item uploaded">
                      <div className="document-upload-item-info">
                        <div className="document-upload-item-name">
                          {doc.original_filename}
                        </div>
                        <div className="document-upload-item-meta">
                          <div className="document-upload-item-details">
                            {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                          </div>
                          <DocumentStatusBadge 
                            status={doc.index_status}
                            errorMessage={doc.error_message}
                          />
                        </div>
                      </div>
                      
                      <DocumentActionMenu
                        documentId={doc.id}
                        indexStatus={doc.index_status}
                        onProcess={handleProcessDocument}
                        onDelete={handleDeleteDocument}
                        onViewDetails={handleViewDetails}
                        onDownload={handleDownloadDocument}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="document-upload-actions">
            <button
              className="document-upload-button secondary"
              onClick={closeDropzone}
            >
              Go back to chat
            </button>
            <button
              className="document-upload-button primary"
              onClick={openFileSelector}
            >
              Select files
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentUpload; 