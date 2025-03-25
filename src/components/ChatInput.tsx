import { useState, KeyboardEvent } from 'react';
import DocumentUpload from './DocumentUpload';
import '../styles/ChatInput.css';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = () => {
    if (message.trim() === '' || isLoading) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <div className="chat-input-container">
      <DocumentUpload />
      <textarea
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message here..."
        disabled={isLoading}
      />
      <button 
        className="send-button"
        onClick={handleSubmit}
        disabled={message.trim() === '' || isLoading}
      >
        {isLoading ? (
          <div className="loading-spinner"></div>
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