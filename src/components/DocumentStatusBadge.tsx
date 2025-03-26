import React from 'react';
import '../styles/DocumentStatusBadge.css';

interface DocumentStatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ status, errorMessage }) => {
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
        return {
          icon: '🔄',
          text: 'Processando',
          className: 'status-processing',
          tooltip: 'Extração e indexação em andamento'
        };
      case 'completed':
        return {
          icon: '✅',
          text: 'Concluído',
          className: 'status-completed',
          tooltip: 'Documento indexado e disponível para consulta'
        };
      case 'failed':
        return {
          icon: '❌',
          text: 'Falha',
          className: 'status-failed',
          tooltip: errorMessage || 'Erro durante o processamento'
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