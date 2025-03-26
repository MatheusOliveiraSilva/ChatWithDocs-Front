import React from 'react';
import '../styles/DocumentStatusBadge.css';

interface DocumentStatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  metadata?: {
    indexing_progress?: number;
    chunks_indexed?: number;
    total_chunks?: number;
    error?: string;
  };
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ 
  status, 
  errorMessage, 
  metadata 
}) => {
  // Determina as propriedades visuais com base no status
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          icon: '⏳',
          text: 'Pendente',
          className: 'status-pending',
          tooltip: 'Documento aguardando processamento'
        };
      case 'processing':
        const progress = metadata?.indexing_progress || 0;
        const chunksIndexed = metadata?.chunks_indexed || 0;
        const totalChunks = metadata?.total_chunks || 0;
        const progressText = totalChunks > 0 
          ? `${progress}% (${chunksIndexed}/${totalChunks} chunks)` 
          : `${progress}%`;
          
        return {
          icon: '🔄',
          text: `Processando: ${progressText}`,
          className: 'status-processing',
          tooltip: `Extração e indexação em andamento - ${progressText} concluído`
        };
      case 'completed':
        return {
          icon: '✅',
          text: 'Concluído',
          className: 'status-completed',
          tooltip: 'Documento indexado e disponível para consulta'
        };
      case 'failed':
        const detailedError = metadata?.error || errorMessage || 'Erro durante o processamento';
        return {
          icon: '❌',
          text: 'Falha',
          className: 'status-failed',
          tooltip: detailedError
        };
      default:
        return {
          icon: '❓',
          text: 'Desconhecido',
          className: 'status-unknown',
          tooltip: 'Status desconhecido'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`document-status-badge ${statusInfo.className}`} title={statusInfo.tooltip}>
      <span className="document-status-icon">{statusInfo.icon}</span>
      <span className="document-status-text">{statusInfo.text}</span>
    </div>
  );
};

export default DocumentStatusBadge; 