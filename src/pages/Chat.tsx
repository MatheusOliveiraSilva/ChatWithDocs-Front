import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import conversationService, { Conversation, Message } from '../services/conversationService';
import authService from '../services/authService';
import agentService, { LLMConfig, DEFAULT_LLM_CONFIG } from '../services/agentService';
import documentService, { Document } from '../services/documentService';
import useThreadParams from '../hooks/useThreadParams';
import ConversationSidebar from '../components/ConversationSidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ModelConfigPanel from '../components/ModelConfigPanel';
import ConfigButton from '../components/ConfigButton';
import DocumentBar from '../components/DocumentBar';
import '../styles/Chat.css';

const Chat = () => {
  // Get the threadId from the URL if it exists using our custom hook
  const { threadId: urlThreadId, navigateToThread, navigateToNewChat, replaceThreadInUrl } = useThreadParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [isConfigPanelExpanded, setIsConfigPanelExpanded] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  // Função para verificar se há documentos em processamento
  const hasProcessingDocuments = () => {
    return uploadedDocuments.some(doc => doc.index_status === 'processing' || doc.index_status === 'pending');
  };

  // Fechar o painel de configuração ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isConfigPanelExpanded && 
          configPanelRef.current && 
          !configPanelRef.current.contains(event.target as Node)) {
        setIsConfigPanelExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isConfigPanelExpanded]);

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle URL threadId changes
  useEffect(() => {
    if (urlThreadId) {
      // If there's a threadId in the URL, load that conversation
      handleSelectConversation(urlThreadId);
    } else {
      // If no threadId in URL, clear the active conversation
      setActiveConversation(null);
      setMessages([]);
      setUploadedDocuments([]);
    }
  }, [urlThreadId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert conversation messages to Message objects when activeConversation changes
  useEffect(() => {
    if (activeConversation) {
      // Verificar se já temos mensagens em exibição - caso seja uma conversa temporária
      // não queremos perder o que já está sendo exibido
      if (messages.length > 0 && !sendingMessage) {
        const formattedMessages = activeConversation.messages.map(([role, content]) => ({
          role: role as 'user' | 'assistant' | 'thought' | 'system',
          content
        }));
        setMessages(formattedMessages);
      }
    } else {
      // Se não há conversa ativa e não está enviando mensagem, limpar mensagens
      if (!sendingMessage) {
        setMessages([]);
      }
    }
  }, [activeConversation]);

  // Carregar documentos da conversa ativa quando ela mudar
  useEffect(() => {
    if (activeConversation?.thread_id) {
      fetchConversationDocuments(activeConversation.thread_id);
    } else {
      setUploadedDocuments([]);
    }
  }, [activeConversation?.thread_id]);

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
      
      // Format the messages for display
      const formattedMessages = conversation.messages.map(([role, content]) => ({
        role: role as 'user' | 'assistant' | 'thought' | 'system',
        content
      }));
      
      setActiveConversation(conversation);
      setMessages(formattedMessages);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setLoading(false);
      // If there's an error loading the conversation, redirect to /chat
      navigate('/chat');
    }
  };

  const handleNewChat = () => {
    // Clear the active conversation and navigate to /chat
    navigateToNewChat();
    setActiveConversation(null);
    setMessages([]);
    setUploadedDocuments([]);
  };

  const handleDeleteConversation = async (threadId: string) => {
    try {
      setLoading(true);
      await conversationService.deleteConversation(threadId);
      
      // Remove the conversation from the list
      setConversations(prevConversations => 
        prevConversations.filter(c => c.thread_id !== threadId)
      );
      
      // If the active conversation was deleted, navigate to /chat
      if (activeConversation && activeConversation.thread_id === threadId) {
        navigateToNewChat();
        setActiveConversation(null);
        setMessages([]);
        setUploadedDocuments([]);
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
        
        // Criar um objeto de conversa temporário imediatamente para feedback visual
        const tempConversation: Conversation = {
          id: 0,
          user_id: 0,
          thread_id: threadId,
          thread_name: threadName,
          messages: [[userMessage.role, userMessage.content]],
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        };
        
        // Definir a conversa ativa antes mesmo da resposta da API
        setActiveConversation(tempConversation);
        
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
                  // Verificar se a conversa já existe na lista
                  const exists = prevConversations.some(c => c.thread_id === threadId);
                  if (!exists) {
                    return [conversation, ...prevConversations];
                  }
                  return prevConversations;
                });
                
                // Atualizar a URL for the conversation
                replaceThreadInUrl(threadId);
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
              
              // Ainda assim, atualizamos a URL
              replaceThreadInUrl(threadId);
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
            
            // Adicionar mensagem de erro do sistema
            const errorMessage: Message = {
              role: 'system',
              content: `Ocorreu um erro ao processar sua solicitação: ${error.message || 'Erro desconhecido'}`
            };
            setMessages(prev => [...prev, errorMessage]);
            
            // Finalizar o estado de envio
            setSendingMessage(false);
          }
        );
      } else {
        // Conversa existente
        const threadId = activeConversation.thread_id;
        
        // Variável para armazenar o estado da resposta parcial
        let streamingMessage: Message = { role: 'assistant', content: '' };
        // Adicionar mensagem vazia do assistente para começar o streaming
        setMessages([...newMessages, streamingMessage]);
        
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
            
            // Atualizar a conversa no banco de dados
            try {
              await conversationService.updateConversation(threadId, completeMessages);
              
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
          {}  // memory_config vazio
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
      <div className="empty-chat">
        <div className="empty-chat-content">
          <h1>Welcome to ChatWithDocs</h1>
          <p>Start a new conversation or drag documents to this area to upload.</p>
          
          <div className="empty-chat-drop-indicator">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>Drop files here</p>
          </div>
        </div>
      </div>
    );
  };

  // Funções para lidar com o drag and drop de documentos na área de chat
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Verifica se o cursor saiu da área de chat
    const rect = messagesContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    // Processar os arquivos arrastados
    if (e.dataTransfer.files.length) {
      // Upload de cada arquivo
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        
        // Verificar tamanho do arquivo (limite de 50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert(`File ${file.name} exceeds the 50MB limit and will not be uploaded.`);
          continue;
        }
        
        try {
          // Gerar um thread_id se ainda não houver conversa ativa
          let threadId = activeConversation?.thread_id;
          let isNewChat = false;
          
          if (!threadId) {
            isNewChat = true;
            threadId = conversationService.generateThreadId();
            const threadName = file.name || "Document Upload"; // Usar o nome do arquivo como nome da conversa
            
            // Criando nova conversa silenciosamente (sem mensagens de sistema)
            await conversationService.createConversation(threadId, threadName, `Document upload: ${file.name}`);
            
            // Buscar a conversa recém-criada
            const conversation = await conversationService.getConversation(threadId);
            setActiveConversation(conversation);
            
            // Atualizar a lista de conversas - MODIFICADO: agora com verificação para evitar duplicatas
            setConversations(prevConversations => {
              // Verificar se a conversa já existe na lista
              const exists = prevConversations.some(c => c.thread_id === threadId);
              if (!exists) {
                return [conversation, ...prevConversations];
              }
              return prevConversations;
            });
            
            // Atualizar a URL
            replaceThreadInUrl(threadId);
          }
          
          // Fazer o upload do documento sem mensagens no chat
          const doc = await documentService.uploadDocument(file, threadId);
          
          // Atualizar a lista de documentos (feedback visual)
          await fetchConversationDocuments(threadId);
          
          // Iniciar explicitamente o processamento do documento se estiver pendente
          if (doc.index_status === 'pending') {
            try {
              await documentService.processDocument(doc.id);
              console.log(`Processing started for: ${file.name}`);
              
              // Atualizar a lista de documentos novamente após iniciar o processamento
              await fetchConversationDocuments(threadId);
            } catch (processingError) {
              console.error(`Error starting document processing:`, processingError);
            }
          }
          
          // Para nova conversa, adicionar uma troca de mensagens contextualizando
          if (isNewChat) {
            // Adicionar mensagens após um momento para garantir que o documento foi processado
            setTimeout(async () => {
              // Mensagem do usuário indicando o upload do documento
              const userMessage: Message = { 
                role: 'user', 
                content: `Here is the document: ${file.name}` 
              };
              
              // Resposta do assistente
              const assistantMessage: Message = { 
                role: 'assistant', 
                content: `Got your document. What would you like to know about "${file.name}"?` 
              };
              
              // Atualizar a UI com as mensagens
              const newMessages = [userMessage, assistantMessage];
              setMessages(newMessages);
              
              // Atualizar a conversa no banco de dados
              await conversationService.updateConversation(threadId, newMessages);
              
              // Rolar para o fundo após as mensagens serem adicionadas
              scrollToBottom();
            }, 500);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          
          // Mostrar apenas um alerta em vez de mensagem no chat
          alert(`Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  // Função para buscar documentos de uma conversa
  const fetchConversationDocuments = async (threadId: string) => {
    console.log("Chat: fetchConversationDocuments chamado com threadId:", threadId);
    
    try {
      const response = await documentService.getConversationDocuments(threadId);
      setUploadedDocuments(response.documents);
      console.log(`Chat: Documentos obtidos para threadId ${threadId}:`, response.documents.length);
      
      // Se estivermos buscando documentos para uma thread que não é a conversa ativa,
      // isso pode significar que o DocumentUpload criou uma nova conversa.
      // Nesse caso, precisamos buscar a conversa e atualizar o estado.
      const isNewThread = !activeConversation || activeConversation.thread_id !== threadId;
      console.log("Chat: É uma nova thread?", isNewThread, 
                 "ThreadId atual:", threadId, 
                 "ThreadId ativo:", activeConversation?.thread_id);
      
      if (threadId && isNewThread) {
        try {
          console.log("Chat: Detectada possível nova conversa criada pelo DocumentUpload. ThreadId:", threadId);
          
          // Buscar a conversa pelo threadId
          const conversation = await conversationService.getConversation(threadId);
          console.log("Chat: Conversa encontrada:", conversation.thread_id, conversation.thread_name);
          
          // Atualizar a conversa ativa
          setActiveConversation(conversation);
          
          // Formatar e definir as mensagens
          const formattedMessages = conversation.messages.map(([role, content]) => ({
            role: role as 'user' | 'assistant' | 'thought' | 'system',
            content
          }));
          setMessages(formattedMessages);
          console.log("Chat: Mensagens configuradas:", formattedMessages.length);
          
          // Atualizar a URL
          console.log("Chat: Atualizando URL para nova thread:", threadId);
          replaceThreadInUrl(threadId);
          
          // Atualizar a lista de conversas se esta conversa não existir lá
          // MODIFICADO: Melhor verificação de existência
          setConversations(prevConversations => {
            // Verificar se a conversa já existe
            const existingIndex = prevConversations.findIndex(c => c.thread_id === threadId);
            
            if (existingIndex >= 0) {
              // Conversa já existe, vamos apenas atualizá-la (não duplicar)
              const newConversations = [...prevConversations];
              newConversations[existingIndex] = conversation;
              return newConversations;
            } else {
              // Conversa não existe, adicioná-la ao início
              console.log("Chat: Adicionando nova conversa à lista");
              return [conversation, ...prevConversations];
            }
          });
        } catch (error) {
          console.error('Erro ao buscar a nova conversa criada:', error);
        }
      }
      
      // Garantir que a barra de documentos seja exibida se houver documentos
      if (response.documents.length > 0) {
        // Forçar uma atualização da interface quando documentos são carregados via callback
        console.log("Chat: Documentos atualizados:", response.documents.length);
        
        // Se a DocumentBar não estiver visível no momento, este setState forçará uma renderização
        setUploadedDocuments([...response.documents]);
      }
    } catch (error) {
      console.error('Error fetching conversation documents:', error);
    }
  };

  // Função para lidar diretamente com novas conversas criadas
  const handleNewConversationCreated = async (newThreadId: string) => {
    console.log("Chat: Nova conversa criada recebida com threadId:", newThreadId);
    
    try {
      // Verificar se já temos essa conversa como ativa
      if (activeConversation?.thread_id === newThreadId) {
        console.log("Chat: Conversa já está ativa, apenas atualizando documentos");
        // Atualizar documentos para a conversa
        fetchConversationDocuments(newThreadId);
        return;
      }
      
      // Buscar a conversa completa
      const conversation = await conversationService.getConversation(newThreadId);
      console.log("Chat: Detalhes da conversa recém-criada:", conversation);
      
      // Atualizar a conversa ativa
      setActiveConversation(conversation);
      
      // Formatar e definir as mensagens
      const formattedMessages = conversation.messages.map(([role, content]) => ({
        role: role as 'user' | 'assistant' | 'thought' | 'system',
        content
      }));
      setMessages(formattedMessages);
      
      // Atualizar a URL para a nova conversa
      replaceThreadInUrl(newThreadId);
      
      // Atualizar a lista de conversas
      setConversations(prevConversations => {
        // Verificar se a conversa já existe na lista
        const existingIndex = prevConversations.findIndex(c => c.thread_id === newThreadId);
        
        if (existingIndex >= 0) {
          // Conversa já existe, vamos apenas atualizá-la
          const newConversations = [...prevConversations];
          newConversations[existingIndex] = conversation;
          return newConversations;
        } else {
          // Conversa não existe, adicioná-la ao início
          return [conversation, ...prevConversations];
        }
      });
      
      // Buscar documentos para a nova conversa 
      fetchConversationDocuments(newThreadId);
      
      console.log("Chat: Nova conversa configurada com sucesso");
    } catch (error) {
      console.error("Chat: Erro ao configurar nova conversa:", error);
    }
  };

  // Função para remover um documento
  const handleRemoveDocument = async (documentId: number) => {
    if (!activeConversation?.thread_id) return;
    
    try {
      // Primeiro tentar remover do índice, se aplicável
      if (window.confirm('Do you also want to remove this document from the search index?')) {
        try {
          await documentService.removeFromIndex(documentId);
        } catch (indexError) {
          console.error(`Error removing document ${documentId} from index:`, indexError);
        }
      }
      
      // Excluir o documento
      await documentService.deleteDocument(documentId);
      
      // Atualizar a lista de documentos
      fetchConversationDocuments(activeConversation.thread_id);
      
      // Removendo as mensagens de sistema desnecessárias
      // setMessages(prev => [
      //   ...prev,
      //   {
      //     role: 'system',
      //     content: `Document removed successfully (ID: ${documentId})`
      //   }
      // ]);
    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error);
      
      // Mostrar erro apenas no console, sem adicionar mensagem no chat
      // setMessages(prev => [
      //   ...prev,
      //   {
      //     role: 'system',
      //     content: `Error removing document: ${error instanceof Error ? error.message : 'Unknown error'}`
      //   }
      // ]);
      
      // Opcionalmente, podemos mostrar um alerta para o usuário em caso de erro
      alert(`Error removing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="chat-container">
      <ConversationSidebar
        conversations={conversations}
        activeThreadId={activeConversation?.thread_id || null}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onLogout={handleLogout}
        loading={loading}
      />
      
      <div className="chat-content">
        <div 
          className={`chat-messages-container ${isDraggingFile ? 'drag-active' : ''}`}
          ref={messagesContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ConfigButton onClick={() => setIsConfigPanelExpanded(!isConfigPanelExpanded)} />
          
          {isConfigPanelExpanded && (
            <div className="config-panel-modal" ref={configPanelRef}>
              <ModelConfigPanel
                llmConfig={llmConfig}
                onConfigChange={handleModelConfigChange}
                isExpanded={true}
                onToggleExpand={() => setIsConfigPanelExpanded(false)}
              />
            </div>
          )}
          
          {messages.length > 0 ? (
            <>
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message}
                    isStreaming={sendingMessage && index === messages.length - 1 && message.role === 'assistant'}
                    thinking={index === messages.length - 1 && message.role === 'assistant' ? currentThinking : undefined}
                    isThinkingStreaming={isThinkingStreaming}
                  />
                ))}
                <div ref={messagesEndRef}></div>
              </div>
            </>
          ) : (
            renderEmptyChat()
          )}
        </div>
        
        {activeConversation && (
          <DocumentBar 
            documents={uploadedDocuments}
            onRemoveDocument={handleRemoveDocument}
            refreshDocuments={() => fetchConversationDocuments(activeConversation.thread_id)}
          />
        )}
        
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={sendingMessage}
          threadId={activeConversation?.thread_id || ''}
          hasProcessingDocuments={hasProcessingDocuments()}
          onDocumentsChanged={() => {
            console.log("Chat: Callback onDocumentsChanged foi chamado");
            
            // Se temos uma conversa ativa, buscamos documentos para ela
            if (activeConversation?.thread_id) {
              console.log("Chat: Buscando documentos para conversa ativa:", activeConversation.thread_id);
              fetchConversationDocuments(activeConversation.thread_id);
            } else {
              console.log("Chat: Não há conversa ativa, buscando conversas recentes");
              // Se não temos uma conversa ativa, pode ser que o DocumentUpload tenha criado uma nova
              // Vamos buscar as conversas recentes para ver se encontramos a nova
              fetchConversations().then(() => {
                console.log("Chat: Conversas atualizadas:", conversations.length);
                if (conversations.length > 0) {
                  // Verificar se já estamos visualizando a conversa mais recente
                  const mostRecentThreadId = conversations[0].thread_id;
                  if (!activeConversation || activeConversation.thread_id !== mostRecentThreadId) {
                    console.log("Chat: Selecionando a conversa mais recente:", mostRecentThreadId);
                    handleSelectConversation(mostRecentThreadId);
                  } else {
                    console.log("Chat: Já estamos visualizando a conversa mais recente");
                  }
                }
              });
            }
          }}
          onNewConversationCreated={handleNewConversationCreated}
        />
      </div>
    </div>
  );
};

export default Chat; 