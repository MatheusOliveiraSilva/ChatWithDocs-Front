import { useState, useEffect } from 'react';
import { Message } from '../services/conversationService';
import '../styles/ChatMessage.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  thinking?: string; // Conteúdo do processo de pensamento do modelo (usado durante streaming)
  isThinkingStreaming?: boolean; // Se o pensamento ainda está sendo streamado
  previousMessage?: Message | null; // Mensagem anterior, para associar pensamentos a mensagens de assistente
  nextMessage?: Message | null; // Próxima mensagem, para associar pensamentos a mensagens de assistente
  toolExecution?: string | null; // Nome da ferramenta sendo executada
  isToolExecuting?: boolean; // Se uma ferramenta está sendo executada
}

const ChatMessage = ({ 
  message, 
  isStreaming = false, 
  thinking, 
  isThinkingStreaming = false,
  nextMessage,
  toolExecution,
  isToolExecuting = false
}: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isThought = message.role === 'thought';
  // Inicialmente expandido apenas se estiver em streaming de pensamento
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(isThinkingStreaming);
  
  // Não renderizar diretamente mensagens do tipo thought - elas serão exibidas associadas às mensagens do assistente
  if (isThought) {
    return null;
  }
  
  // Determinar se deve mostrar e minimizar a caixa de pensamento
  const shouldShowThinking = thinking && thinking.trim().length > 0;
  const shouldMinimizeThinking = !isThinkingStreaming && message.content && !isUser;
  
  // Verificar se há um pensamento associado a esta mensagem (para mensagens do histórico)
  const hasAssociatedThought = 
    nextMessage && 
    message.role === 'user' && 
    nextMessage.role === 'thought';
  
  // Obter o conteúdo do pensamento associado
  const associatedThoughtContent = 
    hasAssociatedThought ? nextMessage?.content : null;
  
  // Verificar se esta é uma mensagem de upload
  const isUploadMessage = message.role === 'system' && 
    (message.content.includes('Uploading document') || 
     message.content.includes('uploaded successfully') ||
     message.content.includes('Document removed') ||
     message.content.includes('Document "') ||
     message.content.includes('Error uploading document'));
  
  // Atualizar o estado de expansão com base no streaming
  useEffect(() => {
    // Se estiver recebendo pensamentos, manter expandido
    if (isThinkingStreaming) {
      setIsThinkingExpanded(true);
    } 
    // Quando o streaming de pensamentos parar, recolher automaticamente
    else if ((shouldShowThinking || associatedThoughtContent) && !isThinkingStreaming) {
      setIsThinkingExpanded(false);
    }
  }, [isThinkingStreaming, shouldShowThinking, associatedThoughtContent]);
  
  const toggleThinkingExpanded = () => {
    setIsThinkingExpanded(!isThinkingExpanded);
  };
  
  return (
    <div className={`chat-message ${message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'assistant'}`}>
      {message.role === 'user' ? (
        <div className="avatar user-avatar">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
      ) : message.role === 'system' ? (
        <div className="avatar system-avatar">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
      ) : (
        <div className="avatar assistant-avatar">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
      )}
      
      <div className={`message-content ${isStreaming ? 'streaming' : ''} ${
        message.role === 'system' ? 'system-message' : ''
      } ${isUploadMessage ? 'upload-message' : ''}`}>
        <div className="message-role">
          {isUser ? 'You' : message.role === 'system' ? 'System' : 'Assistant'}
        </div>
        
        {/* Caixa de processo de pensamento do streaming atual */}
        {shouldShowThinking && (
          <div className={`thinking-container ${shouldMinimizeThinking && !isThinkingExpanded ? 'minimized' : ''}`}>
            <div className="thinking-header" onClick={toggleThinkingExpanded}>
              <span>Thought Process</span>
              <span className={`thinking-expand-icon ${isThinkingExpanded ? 'expanded' : ''}`}>
                {isThinkingExpanded ? '▼' : '▶'}
              </span>
            </div>
            <div className={`thinking-content ${isThinkingExpanded ? 'expanded' : ''} ${isThinkingStreaming ? 'thinking-streaming' : ''}`}>
              {thinking}
            </div>
          </div>
        )}
        
        {/* Caixa de processo de pensamento de mensagens carregadas do histórico */}
        {associatedThoughtContent && (
          <div className={`thinking-container ${!isThinkingExpanded ? 'minimized' : ''}`}>
            <div className="thinking-header" onClick={toggleThinkingExpanded}>
              <span>Thought Process</span>
              <span className={`thinking-expand-icon ${isThinkingExpanded ? 'expanded' : ''}`}>
                {isThinkingExpanded ? '▼' : '▶'}
              </span>
            </div>
            <div className={`thinking-content ${isThinkingExpanded ? 'expanded' : ''}`}>
              {associatedThoughtContent}
            </div>
          </div>
        )}
        
        {/* Feedback visual de execução de ferramentas */}
        {isToolExecuting && toolExecution && (
          <div className="tool-execution-container">
            <div className="tool-execution-content">
              <div className="tool-execution-spinner"></div>
              <span className="tool-execution-text">
                Executando ferramenta: <strong>{toolExecution}</strong>
              </span>
            </div>
          </div>
        )}
        
        {/* Conteúdo da mensagem com suporte a Markdown avançado */}
        <div className="message-text">
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Customizar renderização de código
                code: ({node, inline, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className}>
                      {children}
                    </code>
                  );
                },
                // Customizar renderização de parágrafos para melhor espaçamento
                p: ({children}) => <p style={{marginBottom: '0.8rem'}}>{children}</p>,
                // Customizar renderização de quebras de linha
                br: () => <br />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 