import { Message } from '../services/conversationService';
import '../styles/ChatMessage.css';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="user-avatar">U</div>
        ) : (
          <div className="assistant-avatar">A</div>
        )}
      </div>
      <div className="message-content">
        <div className="message-role">{isUser ? 'You' : 'Assistant'}</div>
        <div className="message-text">{message.content}</div>
      </div>
    </div>
  );
};

export default ChatMessage; 