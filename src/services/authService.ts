import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5005';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// Debug logs
console.log('Environment variables loaded:');
console.log('API_URL:', API_URL);
console.log('FRONTEND_URL:', FRONTEND_URL);

export const authService = {
  // Verifica se o usuário está autenticado
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },

  // Processa o retorno do callback de autenticação
  handleAuthCallback: async (code: string) => {
    try {
      // We can add a redirect_uri parameter to inform the backend where to redirect
      const callbackUrl = `${API_URL}/auth/callback?code=${code}&redirect_uri=${encodeURIComponent(`${FRONTEND_URL}/auth/callback`)}`;
      console.log('Callback URL:', callbackUrl);
      
      const response = await axios.get(callbackUrl);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error processing authentication:', error);
      return false;
    }
  },

  // Login function
  login: () => {
    // Try different redirect parameter formats to ensure compatibility with backend
    // Backend might be looking for a different parameter name
    const redirectUri = encodeURIComponent(`${FRONTEND_URL}/auth/callback`);
    
    // Adicionado múltiplos parâmetros para forçar a tela de seleção de usuário
    const loginUrl = `${API_URL}/auth/login?redirect_uri=${redirectUri}&callback=${redirectUri}&callback_url=${redirectUri}&returnTo=${redirectUri}&return_url=${redirectUri}&prompt=login&force_login=true&ui_locales=pt-BR`;
    
    console.log('Redirecting to:', loginUrl);
    window.location.href = loginUrl;
  },

  // Clear all authentication data
  clearAuth: () => {
    // Remove token
    localStorage.removeItem('token');
    // Remove user info
    localStorage.removeItem('user');
    // Clear session storage as well
    sessionStorage.clear();
    
    // Clear specific cookies that might be causing auto-login
    document.cookie = 'user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Clear any cookies related to auth
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log('All auth data cleared');
  },

  // Realiza o logout do usuário
  logout: async () => {
    try {
      // Primeiro, chama o endpoint de logout do backend para limpar cookies do servidor
      await axios.get(`${API_URL}/auth/logout`, {
        headers: authService.getAuthHeader(),
        withCredentials: true
      });
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      // Limpa dados locais mesmo se falhar no servidor
      authService.clearAuth();
    }
  },

  // Obtém o token de autenticação para requisições
  getAuthHeader: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  
  // Obtém o ID da sessão do usuário, seja do token JWT ou gera um temporário
  getSessionId: () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Tenta extrair informações do token (JWT format: header.payload.signature)
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        
        // Retorna o ID do usuário ou subject do token
        return decoded.sub || decoded.userId || decoded.user_id || decoded.id || 'user';
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    }
    
    // Se não tiver token ou falhar ao decodificar, usa um ID de sessão do localStorage ou cria um novo
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      // Formato anterior: session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}
      // Formato novo mais curto: s-${últimos 5 dígitos do timestamp}-${6 caracteres alfanuméricos}
      const timestamp = Date.now().toString().slice(-5);
      const randomPart = Math.random().toString(36).substring(2, 8);
      sessionId = `s-${timestamp}-${randomPart}`;
      localStorage.setItem('session_id', sessionId);
    }
    
    return sessionId;
  },
};

export default authService; 