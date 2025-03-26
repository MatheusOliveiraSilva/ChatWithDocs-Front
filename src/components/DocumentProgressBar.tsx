import React, { useState, useEffect } from 'react';
import documentService from '../services/documentService';
import '../styles/DocumentProgressBar.css';

interface DocumentProgressBarProps {
  documentId: number;
  onProgressComplete?: () => void;
}

const DocumentProgressBar: React.FC<DocumentProgressBarProps> = ({ 
  documentId,
  onProgressComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [chunksIndexed, setChunksIndexed] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchProgress = async () => {
      try {
        const document = await documentService.getDocument(documentId);
        
        // Extrair os metadados de progresso
        const indexingProgress = document.doc_metadata?.indexing_progress || 0;
        const chunksIndexed = document.doc_metadata?.chunks_indexed || 0;
        const totalChunks = document.doc_metadata?.total_chunks || 0;
        
        setProgress(indexingProgress);
        setChunksIndexed(chunksIndexed);
        setTotalChunks(totalChunks);
        
        // Parar de fazer polling quando o documento estiver completamente indexado
        // ou se o status não for mais "processing"
        if (indexingProgress === 100 || document.index_status !== "processing") {
          setIsPolling(false);
          if (intervalId) {
            clearInterval(intervalId);
          }
          
          // Notificar o componente pai que o progresso foi concluído
          if (onProgressComplete) {
            onProgressComplete();
          }
        }
      } catch (error) {
        console.error("Erro ao buscar progresso do documento", error);
        setIsPolling(false);
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Buscar o progresso imediatamente
    fetchProgress();
    
    // E então iniciar o polling
    if (isPolling) {
      intervalId = setInterval(fetchProgress, 5000); // Verificar a cada 5 segundos
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [documentId, isPolling, onProgressComplete]);

  // Calcular se devemos mostrar porcentagem ou chunks
  const shouldShowChunks = totalChunks > 0 && chunksIndexed > 0;

  return (
    <div className="document-progress-container">
      <div className="document-progress-bar">
        <div 
          className="document-progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="document-progress-text">
        {shouldShowChunks ? (
          <span>
            {progress}% - {chunksIndexed}/{totalChunks} chunks indexados
          </span>
        ) : (
          <span>{progress}% indexado</span>
        )}
      </div>
    </div>
  );
};

export default DocumentProgressBar; 