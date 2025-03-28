import React, { useState, useRef, useEffect } from 'react';
import '../styles/DocumentActionMenu.css';

interface DocumentActionMenuProps {
  documentId: number;
  indexStatus: string;
  onProcess: (id: number) => void;
  onDelete: (id: number) => void;
  onViewDetails: (id: number) => void;
  onDownload: (id: number) => void;
}

const DocumentActionMenu: React.FC<DocumentActionMenuProps> = ({
  documentId,
  indexStatus,
  onProcess,
  onDelete,
  onViewDetails,
  onDownload
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="document-action-menu-container" ref={menuRef}>
      <button
        className="document-action-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu de ações"
        title="Menu de ações"
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
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className="document-action-menu">
          <button
            className="document-action-menu-item"
            onClick={() => {
              onViewDetails(documentId);
              setIsOpen(false);
            }}
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Ver detalhes
          </button>

          <button
            className="document-action-menu-item"
            onClick={() => {
              onDownload(documentId);
              setIsOpen(false);
            }}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>

          {(indexStatus === 'pending' || indexStatus === 'failed') && (
            <button
              className="document-action-menu-item"
              onClick={() => {
                onProcess(documentId);
                setIsOpen(false);
              }}
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
              {indexStatus === 'failed' ? 'Reprocessar' : 'Processar'}
            </button>
          )}

          <button
            className="document-action-menu-item delete"
            onClick={() => {
              if (window.confirm('Tem certeza que deseja excluir este documento?')) {
                onDelete(documentId);
                setIsOpen(false);
              }
            }}
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentActionMenu; 