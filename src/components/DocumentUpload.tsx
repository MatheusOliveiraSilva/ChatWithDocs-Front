import { useState, useRef, useEffect } from 'react';
import documentService, { Document } from '../services/documentService';
import DocumentProgressBar from './DocumentProgressBar';
import DocumentStatusBadge from './DocumentStatusBadge';
import '../styles/DocumentUpload.css';

// Interface para props do componente
interface DocumentUploadProps {
  threadId: string;
  onDocumentsChanged?: () => void; // Callback para notificar mudanças nos documentos
  onNewConversationCreated?: (newThreadId: string) => void; // Novo callback específico para nova conversa
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ threadId, onDocumentsChanged, onNewConversationCreated }) => {
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDocumentArea, setShowDocumentArea] = useState(false);
  // Novo estado para rastrear documentos que começaram a ser processados nesta sessão
  const [documentsInProcessing, setDocumentsInProcessing] = useState<number[]>([]);
  // Novo estado para rastrear se o polling está ativo
  const [isPollingActive, setIsPollingActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Efeito para buscar documentos da conversa atual
  const fetchUploadedDocuments = async () => {
    if (!threadId) {
      setUploadedDocuments([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await documentService.getConversationDocuments(threadId);
      
      // Comparar com documentos anteriores para verificar mudanças de status
      const previousActiveDocIds = documentsInProcessing;
      
      // Encontrar documentos que estavam sendo processados e agora estão concluídos
      const completedDocIds = previousActiveDocIds.filter(docId => {
        const doc = result.documents.find(d => d.id === docId);
        return doc && doc.index_status === 'completed';
      });
      
      // Verificar se temos novos documentos ou mudanças de status
      const hadDocumentChanges = 
        result.documents.length !== uploadedDocuments.length || 
        completedDocIds.length > 0;
      
      // Atualizar a lista de documentos
      setUploadedDocuments(result.documents);
      
      // If we have documents, show the document area
      if (result.documents.length > 0) {
        setShowDocumentArea(true);
        
        // Notificar o componente pai sobre as mudanças nos documentos
        if (hadDocumentChanges && onDocumentsChanged) {
          onDocumentsChanged();
        }
        
        // Verificar se algum documento mudou de status para completo
        if (completedDocIds.length > 0) {
          // Atualizar a lista de documentos em processamento
          setDocumentsInProcessing(prev => 
            prev.filter(id => !completedDocIds.includes(id))
          );
        }
      }
      
      // Verificar se ainda existem documentos ativos que precisam de polling
      const hasActiveDocuments = result.documents.some(
        doc => doc.index_status === 'pending' || doc.index_status === 'processing'
      );
      
      // Atualizar o estado de polling com base na existência de documentos ativos
      setIsPollingActive(hasActiveDocuments);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Buscar documentos inicialmente
    fetchUploadedDocuments();
    
    // Não configurar polling imediatamente, apenas se houver documentos ativos
    let intervalId: number | null = null;
    
    // Só ativar o polling se houver documentos em processamento
    if (isPollingActive) {
      intervalId = window.setInterval(fetchUploadedDocuments, 10000);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [threadId, isPollingActive]);

  // Efeito para fechar o painel quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.document-upload-wrapper')
      ) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Função para abrir o seletor de arquivos
  const openFileSelector = () => {
    // Resetar o input para garantir que o onChange dispara mesmo para o mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  // Função para alternar a visibilidade do painel
  const togglePanel = () => {
    // Forçar atualização da lista antes de abrir o painel
    if (!isPanelOpen) {
      fetchUploadedDocuments().then(() => {
        setIsPanelOpen(true);
      });
    } else {
      setIsPanelOpen(false);
    }
  };

  // Verificar se há documentos em processamento
  const activeDocuments = uploadedDocuments.filter(
    doc => doc.index_status === 'pending' || doc.index_status === 'processing'
  );
  
  // Check for recently completed documents
  const completedDocuments = uploadedDocuments.filter(
    doc => doc.index_status === 'completed'
  );

  // Function to manually process a document
  const handleProcessDocument = async (doc: Document) => {
    try {
      await documentService.processDocument(doc.id);
      
      // Adicionar o documento à lista de documentos em processamento
      setDocumentsInProcessing(prev => [...prev, doc.id]);
      
      // Ativar o polling
      setIsPollingActive(true);
      
      // Update the document in the list
      setUploadedDocuments(prev => 
        prev.map(d => 
          d.id === doc.id 
            ? { ...d, index_status: 'processing' } 
            : d
        )
      );
      
      // Wait a moment and then update the entire list
      setTimeout(() => {
        fetchUploadedDocuments();
        setShowDocumentArea(true);
      }, 2000);
    } catch (error) {
      console.error('Error processing document:', error);
    }
  };

  // Function to handle document processing completion
  const handleProcessingComplete = async () => {
    await fetchUploadedDocuments();
    
    // Keep the document area visible after processing completes
    setShowDocumentArea(true);
  };

  // Function to render a document
  const renderDocument = (doc: Document) => {
    return (
      <div key={doc.id} className="document-item">
        <div className="document-item-header">
          <div className="document-item-name" title={doc.original_filename}>
            {doc.original_filename}
          </div>
          <DocumentStatusBadge 
            status={doc.index_status} 
            errorMessage={doc.error_message}
            progress={doc.doc_metadata?.indexing_progress || 0}
            chunksIndexed={doc.doc_metadata?.chunks_indexed || 0}
            totalChunks={doc.doc_metadata?.total_chunks || 0}
          />
        </div>
        
        {doc.index_status === 'processing' && doc.doc_metadata?.indexing_progress > 0 && (
          <DocumentProgressBar 
            documentId={doc.id} 
            onProgressComplete={handleProcessingComplete}
          />
        )}
        
        {doc.index_status === 'failed' && doc.error_message && (
          <div className="document-error-message">
            Error: {doc.error_message}
          </div>
        )}
        
        {(doc.index_status === 'pending' || doc.index_status === 'failed') && (
          <button 
            className="document-process-button"
            onClick={() => handleProcessDocument(doc)}
          >
            {doc.index_status === 'failed' ? 'Retry Processing' : 'Start Processing'}
          </button>
        )}
      </div>
    );
  };

  // Função para clear file input so it can be reused for the same file
  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Função para processar os arquivos selecionados
  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    
    console.log(`Processing ${files.length} files for upload`);
    setIsUploading(true);
    
    // Filtra arquivos muito grandes (limite de 50MB)
    const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    
    // Adiciona avisos para arquivos muito grandes
    if (oversizedFiles.length > 0) {
      const errorMessage = `${oversizedFiles.length} file(s) exceed the 50MB limit and will not be uploaded.`;
      alert(errorMessage);
    }
    
    if (validFiles.length === 0) {
      // Se não houver arquivos válidos, desativar o estado de upload após um pequeno atraso
      // para que o usuário veja o feedback visual
      setTimeout(() => {
        setIsUploading(false);
      }, 1000);
      return; // Não há arquivos válidos para upload
    }
    
    // Verificar se temos um threadId ou precisamos criar um novo
    let currentThreadId = threadId;
    let isNewChat = false;
    
    // Se não tiver threadId, precisamos criar uma nova conversa
    if (!currentThreadId) {
      try {
        isNewChat = true;
        console.log("DocumentUpload: Criando nova conversa (threadId não encontrado)");
        const conversationService = await import('../services/conversationService').then(m => m.default);
        currentThreadId = conversationService.generateThreadId();
        console.log("DocumentUpload: Novo threadId gerado:", currentThreadId);
        const threadName = validFiles[0].name || "Document Upload"; // Usar o nome do arquivo como nome da conversa
        
        // Criando nova conversa silenciosamente
        await conversationService.createConversation(currentThreadId, threadName, `Document upload: ${validFiles[0].name}`);
        console.log("DocumentUpload: Nova conversa criada com sucesso para threadId:", currentThreadId);
        
        // Chamar o callback específico para nova conversa, se disponível
        if (onNewConversationCreated) {
          console.log("DocumentUpload: Notificando componente pai sobre nova conversa com threadId:", currentThreadId);
          onNewConversationCreated(currentThreadId);
        } else {
          console.log("DocumentUpload: Callback onNewConversationCreated não fornecido, usando onDocumentsChanged como fallback");
          
          // Notificar o componente pai que um novo chat foi criado - CRUCIAL!
          // Esta chamada deve fazer o Chat.tsx buscar a nova conversa
          if (onDocumentsChanged) {
            console.log("DocumentUpload: Notificando componente pai sobre a nova conversa via onDocumentsChanged");
            onDocumentsChanged();
            
            // Chamar onDocumentsChanged várias vezes com pequenos intervalos
            // Isso é uma solução de contorno para garantir que o componente pai receba a notificação
            setTimeout(() => {
              console.log("DocumentUpload: Enviando notificação adicional após 500ms");
              if (onDocumentsChanged) onDocumentsChanged();
            }, 500);
            
            setTimeout(() => {
              console.log("DocumentUpload: Enviando notificação adicional após 1500ms");
              if (onDocumentsChanged) onDocumentsChanged();
            }, 1500);
          } else {
            console.warn("DocumentUpload: Nenhum callback fornecido!");
          }
        }
      } catch (error) {
        console.error('Error creating new conversation:', error);
        alert('Failed to create a new conversation. Please try again.');
        setIsUploading(false);
        return;
      }
    }
    
    // Array para armazenar os documentos carregados temporariamente
    let tempUploadedDocs: Document[] = [...uploadedDocuments];
    let uploadSuccess = false;
    
    // Upload dos arquivos válidos
    for (const file of validFiles) {
      try {
        console.log(`Starting upload for: ${file.name}`);
        const uploadedDoc = await documentService.uploadDocument(file, currentThreadId);
        console.log(`Upload completed for: ${file.name}`);
        
        // Marcar que pelo menos um upload foi bem-sucedido
        uploadSuccess = true;
        
        // Adicionar o documento à lista temporária
        tempUploadedDocs.push(uploadedDoc);
        // Atualizar o estado para refletir o novo documento imediatamente
        setUploadedDocuments([...tempUploadedDocs]);
        
        // Make sure the document area is visible
        setShowDocumentArea(true);
        
        // Notificar o componente pai que temos um novo documento
        if (onDocumentsChanged) {
          onDocumentsChanged();
        }
        
        // Start processing explicitly, if necessary
        if (uploadedDoc.index_status === 'pending') {
          try {
            await documentService.processDocument(uploadedDoc.id);
            console.log(`Processing started for: ${file.name}`);
            
            // Adicionar o id do documento à lista de documentos em processamento
            setDocumentsInProcessing(prev => [...prev, uploadedDoc.id]);
            
            // Ativar o polling
            setIsPollingActive(true);
            
            // Atualizar o documento na lista temporária
            tempUploadedDocs = tempUploadedDocs.map(doc => 
              doc.id === uploadedDoc.id 
                ? { ...doc, index_status: 'processing' } 
                : doc
            );
            // Atualizar o estado com o documento em processamento
            setUploadedDocuments([...tempUploadedDocs]);
          } catch (processingError) {
            console.error(`Error starting document processing:`, processingError);
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Para nova conversa, adicionar uma troca de mensagens contextualizando
    if (isNewChat && uploadSuccess) {
      try {
        const conversationService = await import('../services/conversationService').then(m => m.default);
        
        // Adicionar mensagens após um momento para garantir que o documento foi processado
        setTimeout(async () => {
          // Mensagem do usuário indicando o upload do documento
          const userMessage = { 
            role: 'user' as const, 
            content: `Here is the document: ${validFiles[0].name}` 
          };
          
          // Resposta do assistente
          const assistantMessage = { 
            role: 'assistant' as const, 
            content: `Got your document. What would you like to know about "${validFiles[0].name}"?` 
          };
          
          // Atualizar a conversa no banco de dados
          await conversationService.updateConversation(currentThreadId, [userMessage, assistantMessage]);
          
          // Notificar o componente pai novamente para atualizar a interface
          if (onDocumentsChanged) {
            onDocumentsChanged();
          }
        }, 500);
      } catch (error) {
        console.error('Error adding initial messages:', error);
      }
    }
    
    // Recarregar a lista de documentos após todos os uploads
    try {
      await fetchUploadedDocuments();
    } catch (error) {
      console.error('Error updating document list:', error);
    } finally {
      // Aguardar um segundo antes de finalizar o status de upload
      // para dar tempo de ver a animação e garantir que a UI atualize corretamente
      setTimeout(() => {
        setIsUploading(false);
        
        // Se houve algum upload bem-sucedido, forçar a exibição do mini-painel por um tempo adicional
        if (uploadSuccess) {
          // Força atualização mais uma vez para garantir que temos os documentos mais recentes
          fetchUploadedDocuments();
          
          // Keep the document area visible
          setShowDocumentArea(true);
          
          // Notificar o componente pai novamente após o término de todos os uploads
          if (onDocumentsChanged) {
            onDocumentsChanged();
          }
        }
        
        // Limpar o input de arquivo para permitir uploads futuros do mesmo arquivo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, uploadSuccess ? 3000 : 1000); // Atraso maior se houve sucesso para permitir ver o painel
    }
  };

  // Conditional rendering based on document state
  const shouldRenderDocumentArea = showDocumentArea || uploadedDocuments.length > 0 || isUploading;

  // Render the entire component
  if (!shouldRenderDocumentArea) {
    return (
      <>
        <div className="document-upload-wrapper">
          <button
            className="document-upload-btn"
            onClick={openFileSelector}
            title="Upload document"
            aria-label="Upload document"
            disabled={isUploading}
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
            {isUploading && <span className="document-upload-spinner"></span>}
          </button>
          {/* Exibir indicador de upload mesmo sem documentos */}
          {isUploading && (
            <div 
              className="document-count" 
              title="Uploading documents"
            >
              <span className="document-upload-spinner"></span>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Botão de upload e status */}
      <div className="document-upload-wrapper">
        <button
          className="document-upload-btn"
          onClick={openFileSelector}
          title="Upload document"
          aria-label="Upload document"
          disabled={isUploading}
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
          {isUploading && <span className="document-upload-spinner"></span>}
        </button>
        
        {/* Contador de documentos clicável */}
        {!isUploading && uploadedDocuments.length > 0 && (
          <div 
            className="document-count" 
            onClick={togglePanel}
            title="View conversation documents"
          >
            {uploadedDocuments.length}
            {activeDocuments.length > 0 && <span className="document-activity-indicator"></span>}
          </div>
        )}
        
        {/* Exibir indicador de upload */}
        {isUploading && (
          <div 
            className="document-count document-count-uploading" 
            title="Uploading documents"
          >
            <span className="document-upload-spinner"></span>
          </div>
        )}
      </div>

      {/* Input de arquivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />
      
      {/* Painel flutuante com lista de documentos */}
      {isPanelOpen && (
        <div className="document-list-panel" ref={panelRef}>
          <div className="document-list-header">
            <h3>Documents</h3>
            <button 
              className="document-list-close" 
              onClick={() => setIsPanelOpen(false)}
              aria-label="Close documents panel"
            >
              &times;
            </button>
          </div>
          <div className="document-list-content">
            {uploadedDocuments.map(renderDocument)}
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentUpload; 