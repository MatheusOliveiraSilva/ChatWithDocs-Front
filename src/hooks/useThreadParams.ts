import { useParams, useNavigate } from 'react-router-dom';

/**
 * Hook personalizado para lidar com parâmetros de thread na URL
 * Facilita a navegação entre conversas e acesso ao threadId atual
 */
const useThreadParams = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();

  /**
   * Navega para uma conversa específica
   * @param id ID da thread para a qual navegar
   */
  const navigateToThread = (id: string) => {
    navigate(`/chat/${id}`);
  };

  /**
   * Navega para a página de nova conversa
   */
  const navigateToNewChat = () => {
    navigate('/chat');
  };

  /**
   * Substitui a URL atual pela URL da thread especificada sem adicionar uma nova entrada no histórico
   * @param id ID da thread para substituir na URL
   */
  const replaceThreadInUrl = (id: string) => {
    navigate(`/chat/${id}`, { replace: true });
  };

  return {
    threadId,
    navigateToThread,
    navigateToNewChat,
    replaceThreadInUrl
  };
};

export default useThreadParams; 