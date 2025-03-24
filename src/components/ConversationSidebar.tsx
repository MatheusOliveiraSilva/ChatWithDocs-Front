import { useEffect, useState } from 'react';
import { Conversation } from '../services/conversationService';
import '../styles/ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeThreadId: string | null;
  onSelectConversation: (threadId: string) => void;
  onNewChat: () => void;
}

const ConversationSidebar = ({
  conversations,
  activeThreadId,
  onSelectConversation,
  onNewChat
}: ConversationSidebarProps) => {
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
        {conversations.length === 0 ? (
          <div className="no-conversations">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.thread_id}
              className={`conversation-item ${activeThreadId === conversation.thread_id ? 'active' : ''}`}
              onClick={() => onSelectConversation(conversation.thread_id)}
            >
              <div className="conversation-title">{conversation.thread_name}</div>
              <div className="conversation-date">{formatDate(conversation.last_used)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar; 