import { useState, useEffect } from 'react';
import { Message } from '../services/conversationService';
import '../styles/ChatMessage.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  thinking?: string; // Conteúdo do processo de pensamento do modelo (usado durante streaming)
  isThinkingStreaming?: boolean; // Se o pensamento ainda está sendo streamado
  previousMessage?: Message | null; // Mensagem anterior, para associar pensamentos a mensagens de assistente
  nextMessage?: Message | null; // Próxima mensagem, para associar pensamentos a mensagens de assistente
}

// Interface para os props do componente de código
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ChatMessage = ({ 
  message, 
  isStreaming = false, 
  thinking, 
  isThinkingStreaming = false,
  previousMessage,
  nextMessage
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
    <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'} ${isStreaming ? 'message-streaming' : ''}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="user-avatar">U</div>
        ) : (
          <div className="assistant-avatar">A</div>
        )}
      </div>
      <div className="message-content">
        <div className="message-role">{isUser ? 'You' : 'Assistant'}</div>
        
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
        
        {/* Conteúdo da mensagem com suporte a Markdown avançado */}
        <div className="message-text">
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              children={message.content}
              components={{
                // @ts-ignore - ignorando erros de tipo para simplificar
                code: ({node, inline, className, children, ...props}) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 