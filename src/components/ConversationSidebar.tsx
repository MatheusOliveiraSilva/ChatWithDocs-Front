import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Conversation } from '../services/conversationService';
import '../styles/ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onDeleteConversation: (threadId: string) => void;
  loading?: boolean;
}

const ConversationSidebar = ({
  conversations,
  activeThreadId,
  onNewChat,
  onDeleteConversation,
  loading = false
}: ConversationSidebarProps) => {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const navigate = useNavigate();

  // Format date to more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Handle delete click with stopPropagation to prevent selecting the conversation
  const handleDeleteClick = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmMessage = 'Tem certeza que deseja excluir esta conversa? Esta ação removerá permanentemente:\n\n' +
      '- Todas as mensagens da conversa\n' +
      '- Todos os documentos associados\n' +
      '- Todos os vetores de indexação no sistema RAG\n\n' +
      'Esta ação não pode ser desfeita.';
    
    if (confirm(confirmMessage)) {
      onDeleteConversation(threadId);
    }
  };

  const handleNewChat = () => {
    navigate('/chat');
    onNewChat();
  };

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button className="new-chat-button" onClick={handleNewChat}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>
      
      <div className="conversations-list">
        {loading ? (
          <div className="loading-conversations">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="no-conversations">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.thread_id}
              to={`/chat/${conversation.thread_id}`}
              className={`conversation-item ${activeThreadId === conversation.thread_id ? 'active' : ''}`}
              onMouseEnter={() => setHoveredConversation(conversation.thread_id)}
              onMouseLeave={() => setHoveredConversation(null)}
            >
              <div className="conversation-content">
                <div className="conversation-title">{conversation.thread_name}</div>
                <div className="conversation-date">{formatDate(conversation.last_used)}</div>
              </div>
              
              {(hoveredConversation === conversation.thread_id || activeThreadId === conversation.thread_id) && (
                <button 
                  className="delete-conversation-button" 
                  onClick={(e) => handleDeleteClick(e, conversation.thread_id)}
                  title="Delete conversation"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar; 