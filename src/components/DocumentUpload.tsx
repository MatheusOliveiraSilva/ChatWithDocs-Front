import { useState, useRef, useEffect } from 'react';
import documentService from '../services/documentService';
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

// Interface para documentos já enviados
interface UploadedDocument {
  id: number;
  original_filename: string;
  file_size: number;
  created_at: string;
}

// Props do componente
interface DocumentUploadProps {
  onDocumentUploaded?: (document: any) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentUploaded }) => {
  const [isDropzoneOpen, setIsDropzoneOpen] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Buscar documentos enviados quando o componente montar
  useEffect(() => {
    fetchUploadedDocuments();
  }, []);

  // Função para buscar documentos já enviados
  const fetchUploadedDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await documentService.getDocuments();
      setUploadedDocuments(response.documents);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setIsLoading(false);
    }
  };

  // Função para abrir o dropzone
  const openDropzone = () => {
    setIsDropzoneOpen(true);
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
    
    // Filtra arquivos muito grandes (limite de 50MB)
    const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    
    // Adiciona avisos para arquivos muito grandes
    if (oversizedFiles.length > 0) {
      const errorMessage = `${oversizedFiles.length} file(s) exceed the 50MB limit and will not be uploaded.`;
      alert(errorMessage);
    }
    
    // Cria novos itens de upload
    const newUploadItems = validFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const
    }));
    
    // Adiciona à lista de uploads
    setUploadItems(prevItems => [...prevItems, ...newUploadItems]);
    
    // Inicia o upload automaticamente
    newUploadItems.forEach(item => uploadFile(item));
  };

  // Função para fazer o upload de um arquivo
  const uploadFile = async (item: UploadItem) => {
    try {
      // Atualiza o status para 'uploading'
      setUploadItems(items =>
        items.map(i => (i.id === item.id ? { ...i, status: 'uploading' as const } : i))
      );
      
      // Simula o progresso (já que a API não fornece feedback de progresso)
      const progressInterval = setInterval(() => {
        setUploadItems(items =>
          items.map(i => {
            if (i.id === item.id && i.progress < 90) {
              return { ...i, progress: i.progress + 10 };
            }
            return i;
          })
        );
      }, 300);
      
      // Envia o arquivo para a API
      const response = await documentService.uploadDocument(item.file);
      
      // Limpa o intervalo de progresso
      clearInterval(progressInterval);
      
      // Atualiza o status para 'success'
      setUploadItems(items =>
        items.map(i =>
          i.id === item.id
            ? { ...i, progress: 100, status: 'success' as const, documentId: response.id }
            : i
        )
      );
      
      // Atualiza a lista de documentos enviados
      setUploadedDocuments(prev => [response, ...prev]);
      
      // Notifica o componente pai
      if (onDocumentUploaded) {
        onDocumentUploaded(response);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
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
      <button
        className="document-upload-btn"
        onClick={openDropzone}
        title="Upload document"
      >
        <svg
          className="document-upload-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
        </svg>
      </button>

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

          {/* Lista de documentos já enviados */}
          {uploadedDocuments.length > 0 && (
            <div className="document-upload-list">
              <h4 className="document-section-title">Uploaded Documents</h4>
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="document-upload-item uploaded">
                  <div className="document-upload-item-info">
                    <div className="document-upload-item-name">
                      {doc.original_filename}
                    </div>
                    <div className="document-upload-item-details">
                      {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>
              ))}
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