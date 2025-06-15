import { useState, KeyboardEvent } from 'react';
import DocumentUpload from './DocumentUpload';
import '../styles/ChatInput.css';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  threadId: string;
  hasProcessingDocuments?: boolean;
  onDocumentsChanged?: () => void;
  onNewConversationCreated?: (newThreadId: string) => void;
}

const ChatInput = ({ 
  onSendMessage, 
  isLoading, 
  threadId, 
  hasProcessingDocuments = false,
  onDocumentsChanged,
  onNewConversationCreated
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = () => {
    if (message.trim() === '' || isLoading || hasProcessingDocuments) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Determinar se o input deve estar desativado
  const inputDisabled = isLoading || hasProcessingDocuments;
  
  // Texto de placeholder com base no estado
  const placeholderText = hasProcessingDocuments 
    ? "Aguarde a indexação dos documentos para enviar mensagens..." 
    : "Digite sua mensagem aqui...";
  
  return (
    <div className="chat-input-container">
      <DocumentUpload 
        threadId={threadId} 
        onDocumentsChanged={onDocumentsChanged}
        onNewConversationCreated={onNewConversationCreated}
      />
      <textarea
        className={`chat-input ${hasProcessingDocuments ? 'processing-documents' : ''}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        disabled={inputDisabled}
      />
      <button 
        className="send-button"
        onClick={handleSubmit}
        disabled={message.trim() === '' || inputDisabled}
      >
        {isLoading ? (
          <div className="loading-spinner"></div>
        ) : hasProcessingDocuments ? (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatInput; 