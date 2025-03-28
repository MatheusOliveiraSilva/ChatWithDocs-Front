import React from 'react';
import '../styles/DocumentStatusBadge.css';

interface DocumentStatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  errorMessage?: string;
  progress?: number;
  chunksIndexed?: number;
  totalChunks?: number;
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ 
  status, 
  errorMessage,
  progress = 0,
  chunksIndexed = 0,
  totalChunks = 0
}) => {
  // Determina as propriedades visuais com base no status
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return {
          icon: '⏳',
          text: 'Pending',
          className: 'status-pending',
          tooltip: 'Document waiting for processing'
        };
      case 'processing':
        // Para determinar se está fazendo upload ou indexando
        // Se não há progresso ainda, provavelmente está fazendo upload
        // Caso contrário, está indexando
        const isUploading = progress === 0;
        const isIndexing = progress > 0;
        
        // Texto apropriado para cada estágio
        let statusText = 'Processing';
        let tooltipText = 'Processing in progress';
        
        if (isUploading) {
          statusText = 'Uploading';
          tooltipText = 'Document is being prepared for indexing';
        } else if (isIndexing) {
          statusText = `Indexing: ${progress}%`;
          tooltipText = `Document is being indexed - ${progress}% completed`;
          
          if (chunksIndexed > 0 && totalChunks > 0) {
            tooltipText += ` (${chunksIndexed}/${totalChunks} chunks)`;
          }
        }
          
        return {
          icon: isUploading ? '📤' : '🔄',
          text: statusText,
          className: `status-processing ${isUploading ? 'status-uploading' : 'status-indexing'}`,
          tooltip: tooltipText
        };
      case 'completed':
        return {
          icon: '✅',
          text: 'Completed',
          className: 'status-completed',
          tooltip: 'Document indexed and ready for queries'
        };
      case 'failed':
        const detailedError = errorMessage || 'Error during processing';
        return {
          icon: '❌',
          text: 'Failed',
          className: 'status-failed',
          tooltip: detailedError
        };
      default:
        return {
          icon: '❓',
          text: 'Unknown',
          className: 'status-unknown',
          tooltip: 'Unknown status'
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