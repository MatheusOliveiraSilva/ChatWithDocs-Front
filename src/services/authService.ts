// Simplified auth service without authentication
// Only provides session management and placeholder user data

export const authService = {
  // Always return demo user ID
  getUserId: (): string => {
    return 'demo-user';
  },

  // Generate unique session ID for conversations
  getSessionId: (): string => {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      const timestamp = Date.now().toString().slice(-5);
      const randomPart = Math.random().toString(36).substring(2, 8);
      sessionId = `s-${timestamp}-${randomPart}`;
      localStorage.setItem('session_id', sessionId);
    }
    
    return sessionId;
  },

  // No authentication headers needed
  getAuthHeader: () => {
    return {};
  },

  // Placeholder functions for compatibility
  isAuthenticated: () => true,
  logout: async () => {
    // Clear session data if needed
    localStorage.removeItem('session_id');
  },
  
  clearAuth: () => {
    localStorage.removeItem('session_id');
  }
};

export default authService; 