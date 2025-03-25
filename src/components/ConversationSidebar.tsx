import { useState } from 'react';
import { Conversation } from '../services/conversationService';
import '../styles/ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeThreadId: string | null;
  onSelectConversation: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (threadId: string) => void;
  onLogout: () => void;
  loading?: boolean;
}

const ConversationSidebar = ({
  conversations,
  activeThreadId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onLogout,
  loading = false
}: ConversationSidebarProps) => {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);

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
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(threadId);
    }
  };

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button className="new-chat-button" onClick={onNewChat}>
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
            <div
              key={conversation.thread_id}
              className={`conversation-item ${activeThreadId === conversation.thread_id ? 'active' : ''}`}
              onClick={() => onSelectConversation(conversation.thread_id)}
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
            </div>
          ))
        )}
      </div>
      
      <div className="sidebar-footer">
        <button className="logout-button" onClick={onLogout} title="Sign Out">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ConversationSidebar; 