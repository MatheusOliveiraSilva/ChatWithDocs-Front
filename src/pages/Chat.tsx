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
  const [currentThinking, setCurrentThinking] = useState('');
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
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
    
    // Limpar pensamento anterior
    setCurrentThinking('');
    setIsThinkingStreaming(false);

    try {
      if (!activeConversation) {
        // Nova conversa - primeiro gera um thread ID e nome
        const threadId = conversationService.generateThreadId();
        const threadName = conversationService.generateThreadName(content);
        
        // Variável para armazenar o estado da resposta parcial
        let streamingMessage: Message = { role: 'assistant', content: '' };
        // Adicionar mensagem vazia do assistente para começar o streaming
        setMessages([...newMessages, streamingMessage]);
        
        console.log('Iniciando streaming para nova conversa:', threadId);
        
        // Usar o streaming para receber a resposta em tempo real
        agentService.streamAgent(
          threadId,
          content,
          llmConfig,
          // Callback para cada chunk recebido
          (chunk) => {
            // Processar diferentes tipos de chunks
            if (chunk.type === 'thinking') {
              // Atualizar o estado de pensamento
              setIsThinkingStreaming(true);
              setCurrentThinking(prev => prev + chunk.content);
            } else if (chunk.type === 'text') {
              // Finalizar o streaming de pensamentos, se houver
              setIsThinkingStreaming(false);
              
              // Atualizar a mensagem do assistente com o novo conteúdo
              streamingMessage.content += chunk.content;
              // Atualizar a UI com a mensagem parcial
              setMessages([...newMessages, { ...streamingMessage }]);
              // Rolar para o final
              scrollToBottom();
            } else {
              // Compatibilidade com o antigo formato
              streamingMessage.content += chunk.content;
              // Atualizar a UI com a mensagem parcial
              setMessages([...newMessages, { ...streamingMessage }]);
              // Rolar para o final
              scrollToBottom();
            }
          },
          // Callback quando o streaming estiver completo
          async (fullResponse) => {
            console.log('Streaming completo, resposta total:', fullResponse.substring(0, 30) + '...');
            
            // Primeiro, garantir que a resposta completa está visível na UI
            const completeMessages: Message[] = [
              ...newMessages,
              { role: 'assistant' as const, content: fullResponse }
            ];
            
            // Adicionar a mensagem de pensamento, se existir
            if (currentThinking.trim()) {
              completeMessages.splice(completeMessages.length - 1, 0, { 
                role: 'thought' as const, 
                content: currentThinking 
              });
            }
            
            setMessages(completeMessages);
            
            // Tentar salvar a conversa e atualizar o estado só depois
            try {
              console.log('Tentando salvar conversa no banco de dados...');
              
              // 1. Criar a conversa com a mensagem do usuário
              console.log('Criando nova conversa com a primeira mensagem do usuário');
              await conversationService.createConversation(threadId, threadName, content);
              
              // 2. Atualizar a conversa com todas as mensagens
              console.log('Adicionando a resposta do assistente e pensamento à conversa');
              await conversationService.updateConversation(threadId, completeMessages);
              
              // 3. Buscar a conversa completa
              console.log('Buscando a conversa atualizada do servidor');
              const conversation = await conversationService.getConversation(threadId);
              console.log('Conversa recuperada:', conversation);
              
              if (conversation) {
                // Atualizar a conversa ativa com os dados do servidor
                setActiveConversation(conversation);
                
                // Atualizar a lista de conversas
                setConversations(prevConversations => {
                  return [conversation, ...prevConversations];
                });
              }
            } catch (error) {
              console.error('Erro ao salvar conversa:', error);
              
              // Mesmo com erro, a conversa continua visível na UI
              // Criamos um objeto local para representar a conversa
              const localConversation: Conversation = {
                id: 0, // temporário
                user_id: 0, // temporário
                thread_id: threadId,
                thread_name: threadName,
                messages: completeMessages.map(msg => [msg.role, msg.content] as [string, string]),
                created_at: new Date().toISOString(),
                last_used: new Date().toISOString()
              };
              
              setActiveConversation(localConversation);
              setConversations(prev => [localConversation, ...prev]);
            }
            
            // Finalizar o estado de envio
            setSendingMessage(false);
          },
          // Callback em caso de erro
          (error) => {
            console.error('Erro durante o streaming:', error);
            
            // Mesmo com erro no streaming, manter a mensagem parcial se existir
            if (streamingMessage.content) {
              console.log('Mantendo mensagem parcial após erro:', streamingMessage.content.substring(0, 30) + '...');
              setMessages([...newMessages, { ...streamingMessage }]);
            } else {
              // Se não tem conteúdo, remove a mensagem vazia do assistente
              setMessages(newMessages);
            }
            
            setSendingMessage(false);
          },
          // Parâmetros adicionais
          threadName,  // Nome da conversa
          {},  // memory_config vazio
          undefined // Não há mensagens anteriores
        );
      } else {
        // Conversa existente - usa streaming também
        
        // Variável para armazenar o estado da resposta parcial
        let streamingMessage: Message = { role: 'assistant', content: '' };
        // Adicionar mensagem vazia do assistente para começar o streaming
        setMessages([...newMessages, streamingMessage]);
        
        // Preparar o histórico de mensagens para enviar ao backend
        const messageHistory = activeConversation.messages.slice();
        
        console.log('Iniciando streaming para conversa existente:', activeConversation.thread_id);
        console.log('Histórico de mensagens:', messageHistory.length, 'mensagens');
        
        // Usar o streaming para receber a resposta em tempo real
        agentService.streamAgent(
          activeConversation.thread_id,
          content,
          llmConfig,
          // Callback para cada chunk recebido
          (chunk) => {
            // Processar diferentes tipos de chunks
            if (chunk.type === 'thinking') {
              // Atualizar o estado de pensamento
              setIsThinkingStreaming(true);
              setCurrentThinking(prev => prev + chunk.content);
            } else if (chunk.type === 'text') {
              // Finalizar o streaming de pensamentos, se houver
              setIsThinkingStreaming(false);
              
              // Atualizar a mensagem do assistente com o novo conteúdo
              streamingMessage.content += chunk.content;
              // Atualizar a UI com a mensagem parcial
              setMessages([...newMessages, { ...streamingMessage }]);
              // Rolar para o final
              scrollToBottom();
            } else {
              // Compatibilidade com o antigo formato
              streamingMessage.content += chunk.content;
              // Atualizar a UI com a mensagem parcial
              setMessages([...newMessages, { ...streamingMessage }]);
              // Rolar para o final
              scrollToBottom();
            }
          },
          // Callback quando o streaming estiver completo
          async (fullResponse) => {
            console.log('Streaming completo, resposta total:', fullResponse.substring(0, 30) + '...');
            
            // Primeiro, garantir que a resposta completa está visível na UI
            const completeMessages: Message[] = [
              ...newMessages,
              { role: 'assistant' as const, content: fullResponse }
            ];
            
            // Adicionar a mensagem de pensamento, se existir
            if (currentThinking.trim()) {
              completeMessages.splice(completeMessages.length - 1, 0, { 
                role: 'thought' as const, 
                content: currentThinking 
              });
            }
            
            setMessages(completeMessages);
            
            // Tentar salvar e atualizar o estado só depois
            try {
              console.log('Tentando atualizar conversa no banco de dados...');
              
              // Atualizar a conversa com a nova mensagem, pensamento e resposta
              console.log('Atualizando conversa com as novas mensagens');
              await conversationService.updateConversation(
                activeConversation.thread_id, 
                completeMessages
              );
              
              // Buscar a conversa atualizada
              console.log('Buscando a conversa atualizada do servidor');
              const conversation = await conversationService.getConversation(activeConversation.thread_id);
              console.log('Conversa recuperada:', conversation);
              
              if (conversation) {
                // Atualizar a conversa ativa com os dados do servidor
                setActiveConversation(conversation);
                
                // Atualizar a conversa na lista
                setConversations(prevConversations => {
                  const index = prevConversations.findIndex(
                    c => c.thread_id === activeConversation.thread_id
                  );
                  
                  if (index >= 0) {
                    const newList = [...prevConversations];
                    newList[index] = conversation;
                    return newList;
                  }
                  
                  return prevConversations;
                });
              }
            } catch (error) {
              console.error('Erro ao atualizar conversa:', error);
              
              // Mesmo com erro, a conversa continua visível na UI
              // Atualizamos o objeto local da conversa
              const updatedMessages = activeConversation.messages.concat([
                ['user', content],
                ['thought', currentThinking],
                ['assistant', fullResponse]
              ]);
              
              const updatedLocalConversation = {
                ...activeConversation,
                messages: updatedMessages,
                last_used: new Date().toISOString()
              };
              
              setActiveConversation(updatedLocalConversation as Conversation);
              
              // Atualizar a conversa na lista localmente
              setConversations(prevConversations => {
                const index = prevConversations.findIndex(
                  c => c.thread_id === activeConversation.thread_id
                );
                
                if (index >= 0) {
                  const newList = [...prevConversations];
                  newList[index] = updatedLocalConversation;
                  return newList;
                }
                
                return prevConversations;
              });
            }
            
            // Finalizar o estado de envio
            setSendingMessage(false);
          },
          // Callback em caso de erro
          (error) => {
            console.error('Erro durante o streaming:', error);
            
            // Mesmo com erro no streaming, manter a mensagem parcial se existir
            if (streamingMessage.content) {
              console.log('Mantendo mensagem parcial após erro:', streamingMessage.content.substring(0, 30) + '...');
              setMessages([...newMessages, { ...streamingMessage }]);
            } else {
              // Se não tem conteúdo, remove a mensagem vazia do assistente
              setMessages(newMessages);
            }
            
            setSendingMessage(false);
          },
          // Parâmetros adicionais
          undefined,  // threadName é undefined para conversas existentes
          {},  // memory_config vazio
          messageHistory  // Enviar o histórico de mensagens
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remover a mensagem temporária em caso de erro
      setMessages(messages);
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
                <ChatMessage 
                  key={index} 
                  message={message} 
                  isStreaming={sendingMessage && index === messages.length - 1 && message.role === 'assistant'}
                  thinking={index === messages.length - 1 && message.role === 'assistant' ? currentThinking : undefined}
                  isThinkingStreaming={isThinkingStreaming}
                  previousMessage={index > 0 ? messages[index - 1] : null}
                  nextMessage={index < messages.length - 1 ? messages[index + 1] : null}
                />
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