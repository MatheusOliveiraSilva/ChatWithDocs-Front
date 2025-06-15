import React, { useRef, useEffect } from 'react';
import { Document } from '../services/documentService';
import DocumentProgressBar from './DocumentProgressBar';
import '../styles/DocumentBar.css';

interface DocumentBarProps {
  documents: Document[];
  onRemoveDocument?: (documentId: number) => void;
  refreshDocuments: () => void;
}

const DocumentBar: React.FC<DocumentBarProps> = ({ 
  documents,
  onRemoveDocument,
  refreshDocuments
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Rolar para o final quando novos documentos são adicionados
  useEffect(() => {
    if (scrollContainerRef.current && documents.length > 0) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [documents.length]);

  if (documents.length === 0) return null;

  return (
    <div className="document-bar-container">
      <div className="document-bar-scroll" ref={scrollContainerRef}>
        {documents.map(doc => (
          <div key={doc.id} className="document-bar-item">
            <div className="document-bar-item-header">
              <div className="document-bar-item-name" title={doc.original_filename}>
                {doc.original_filename}
              </div>
              <div className="document-bar-item-size">
                {formatFileSize(doc.file_size || 0)}
              </div>
              {onRemoveDocument && (
                <button 
                  className="document-bar-item-close"
                  onClick={() => onRemoveDocument(doc.id)}
                  title="Remove document"
                >
                  ×
                </button>
              )}
            </div>

            {doc.index_status === 'pending' && (
              <div className="document-bar-status pending">Pending processing</div>
            )}
            
            {doc.index_status === 'processing' && (
              <>
                <div className="document-bar-status processing">Processing...</div>
                <DocumentProgressBar 
                  documentId={doc.id} 
                  onProgressComplete={refreshDocuments}
                />
              </>
            )}
            
            {doc.index_status === 'completed' && (
              <div className="document-bar-status completed">Ready for use</div>
            )}
            
            {doc.index_status === 'failed' && (
              <div className="document-bar-status failed" title={doc.error_message}>
                Processing failed
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentBar; 