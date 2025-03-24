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
    
    // Tenta com vários parâmetros de redirecionamento diferentes que o backend pode estar esperando
    const loginUrl = `${API_URL}/auth/login?redirect_uri=${redirectUri}&callback=${redirectUri}&callback_url=${redirectUri}&returnTo=${redirectUri}&return_url=${redirectUri}`;
    
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
    // Clear any cookies related to auth
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log('All auth data cleared');
  },

  // Realiza o logout do usuário
  logout: () => {
    authService.clearAuth();
  },

  // Obtém o token de autenticação para requisições
  getAuthHeader: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};

export default authService; 