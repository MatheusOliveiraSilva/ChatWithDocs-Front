import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import conversationService, { Conversation, Message } from '../services/conversationService';
import authService from '../services/authService';
import agentService, { LLMConfig, DEFAULT_LLM_CONFIG } from '../services/agentService';
import ConversationSidebar from '../components/ConversationSidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ModelConfigPanel from '../components/ModelConfigPanel';
import '../styles/Chat.css';

const Chat = () => {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [isConfigPanelExpanded, setIsConfigPanelExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert conversation messages to Message objects when activeConversation changes
  useEffect(() => {
    if (activeConversation) {
      const formattedMessages = activeConversation.messages.map(([role, content]) => ({
        role: role as 'user' | 'assistant',
        content
      }));
      setMessages(formattedMessages);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const conversationsData = await conversationService.getConversations();
      setConversations(conversationsData);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
      setLoading(false);
      
      // Check if error is due to authentication
      if (error.response && error.response.status === 401) {
        // Redirect to login page
        authService.logout();
        navigate('/');
      }
    }
  };

  const handleSelectConversation = async (threadId: string) => {
    try {
      setLoading(true);
      const conversation = await conversationService.getConversation(threadId);
      setActiveConversation(conversation);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (threadId: string) => {
    try {
      setLoading(true);
      await conversationService.deleteConversation(threadId);
      
      // Remove the conversation from the list
      setConversations(prevConversations => 
        prevConversations.filter(c => c.thread_id !== threadId)
      );
      
      // If the active conversation was deleted, return to the new conversation state
      if (activeConversation && activeConversation.thread_id === threadId) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Apenas atualizamos o estado local temporariamente para feedback imediato ao usuário
    const userMessage: Message = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setSendingMessage(true);

    try {
      if (!activeConversation) {
        // Nova conversa - primeiro gera um thread ID e nome
        const threadId = conversationService.generateThreadId();
        const threadName = conversationService.generateThreadName(content);
        
        // Invoca o agente diretamente com a mensagem do usuário
        // Não criamos a conversa ainda - isso será feito pelo backend após a resposta
        const agentResponse = await agentService.invokeAgent(
          threadId,
          content,
          llmConfig
        );
        
        if (agentResponse.updated_conversation) {
          // Atualizamos com os dados do backend para garantir consistência
          const updatedConversation: Conversation = {
            id: agentResponse.updated_conversation.id,
            user_id: 0, // Será definido pelo backend
            thread_id: agentResponse.updated_conversation.thread_id,
            thread_name: threadName, // Mantém o nome gerado inicialmente
            messages: agentResponse.updated_conversation.messages,
            created_at: new Date().toISOString(),
            last_used: agentResponse.updated_conversation.last_used
          };
          
          setActiveConversation(updatedConversation);
          
          // Atualiza mensagens com base no que o servidor retornou
          const updatedMessages = agentResponse.updated_conversation.messages.map(([role, content]) => ({
            role: role as 'user' | 'assistant',
            content
          }));
          
          setMessages(updatedMessages);
          
          // Atualiza a lista de conversas
          setConversations(prevConversations => {
            const updatedConv: Conversation = {
              id: agentResponse.updated_conversation.id,
              user_id: 0,
              thread_id: agentResponse.updated_conversation.thread_id,
              thread_name: threadName,
              messages: agentResponse.updated_conversation.messages,
              created_at: new Date().toISOString(),
              last_used: agentResponse.updated_conversation.last_used
            };
            
            return [updatedConv, ...prevConversations];
          });
        }
      } else {
        // Conversa existente - apenas invoca o agente
        const agentResponse = await agentService.invokeAgent(
          activeConversation.thread_id,
          content,
          llmConfig
        );
        
        if (agentResponse.updated_conversation) {
          // Atualiza conversa ativa
          const updatedConversation: Conversation = {
            id: agentResponse.updated_conversation.id,
            user_id: activeConversation.user_id,
            thread_id: agentResponse.updated_conversation.thread_id,
            thread_name: activeConversation.thread_name,
            messages: agentResponse.updated_conversation.messages,
            created_at: activeConversation.created_at,
            last_used: agentResponse.updated_conversation.last_used
          };
          
          setActiveConversation(updatedConversation);
          
          // Atualiza mensagens com base no que o servidor retornou
          const updatedMessages = agentResponse.updated_conversation.messages.map(([role, content]) => ({
            role: role as 'user' | 'assistant',
            content
          }));
          
          setMessages(updatedMessages);
          
          // Atualiza a conversa na lista
          setConversations(prevConversations => {
            const index = prevConversations.findIndex(
              c => c.thread_id === activeConversation.thread_id
            );
            
            if (index >= 0) {
              const newList = [...prevConversations];
              
              const updatedConv: Conversation = {
                ...prevConversations[index],
                messages: agentResponse.updated_conversation.messages,
                last_used: agentResponse.updated_conversation.last_used
              };
              
              newList[index] = updatedConv;
              return newList;
            }
            
            return prevConversations;
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remover a mensagem temporária em caso de erro
      setMessages(messages);
      // You might want to show an error message to the user
    } finally {
      setSendingMessage(false);
    }
  };

  const handleModelConfigChange = (config: LLMConfig) => {
    setLLMConfig(config);
  };

  const renderEmptyChat = () => {
    return (
      <div className="chat-messages-empty">
        <div className="empty-chat-icon">✨</div>
        <h2 className="empty-chat-title">ChatWithDocuments</h2>
        <p className="empty-chat-subtitle">
          Start a new conversation by typing a message below or select an existing conversation from the sidebar.
        </p>
      </div>
    );
  };

  return (
    <div className="chat-container">
      <ConversationSidebar
        conversations={conversations}
        activeThreadId={activeConversation?.thread_id || null}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />
      
      <div className="chat-main">
        <div className="chat-header">
          <h1 className="chat-title">
            {activeConversation ? activeConversation.thread_name : 'New Chat'}
          </h1>
          <button className="logout-button" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
        
        <ModelConfigPanel
          llmConfig={llmConfig}
          onConfigChange={handleModelConfigChange}
          isExpanded={isConfigPanelExpanded}
          onToggleExpand={() => setIsConfigPanelExpanded(!isConfigPanelExpanded)}
        />
        
        <div className="chat-messages">
          {messages.length > 0 ? (
            <>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            renderEmptyChat()
          )}
        </div>
        
        <div className="chat-input-wrapper">
          <ChatInput onSendMessage={handleSendMessage} isLoading={sendingMessage} />
        </div>
      </div>
    </div>
  );
};

export default Chat; 