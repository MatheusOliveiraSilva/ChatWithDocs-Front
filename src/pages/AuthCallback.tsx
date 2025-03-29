import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/AuthCallback.css';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>('Iniciando processamento...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuthentication = async () => {
      try {
        setDebug(prev => prev + '\nVerificando parâmetros da URL...');
        // Check if we have a token in the URL (new format)
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const code = urlParams.get('code');
        
        // Debug para ambiente de produção
        setDebug(prev => prev + `\nURL params - token: ${token ? 'presente' : 'ausente'}, code: ${code ? 'presente' : 'ausente'}`);
        
        if (token) {
          setDebug(prev => prev + '\nToken encontrado na URL, armazenando...');
          // Store the token in localStorage
          localStorage.setItem('token', token);
          console.log('Token received and stored successfully');
          // Redirect to chat page
          setDebug(prev => prev + '\nRedirecionando para /chat...');
          setTimeout(() => navigate('/chat'), 500);
          return;
        }
        
        // If no token, try the old method with code
        if (!code) {
          const errorMsg = 'Authentication token or code not found';
          setDebug(prev => prev + `\nErro: ${errorMsg}`);
          setError(errorMsg);
          return;
        }

        // Process authentication with code
        setDebug(prev => prev + '\nProcessando código de autenticação...');
        const success = await authService.handleAuthCallback(code);
        
        if (success) {
          // Redirect to the main page after successful authentication
          setDebug(prev => prev + '\nAutenticação bem-sucedida, redirecionando...');
          setTimeout(() => navigate('/chat'), 500);
        } else {
          const errorMsg = 'Authentication failed';
          setDebug(prev => prev + `\nErro: ${errorMsg}`);
          setError(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        console.error('Error during callback processing:', err);
        setDebug(prev => prev + `\nErro de exceção: ${errorMsg}`);
        setError('An error occurred during authentication');
      }
    };

    processAuthentication();
  }, [location, navigate]);

  return (
    <div className="callback-container">
      <div className="callback-card">
        {error ? (
          <>
            <p className="callback-error">{error}</p>
            {import.meta.env.DEV && (
              <div className="debug-info">
                <h4>Debug Info:</h4>
                <pre>{debug}</pre>
                <pre>Current URL: {window.location.href}</pre>
              </div>
            )}
          </>
        ) : (
          <div className="callback-loading">
            <div className="spinner"></div>
            <p>Processing your authentication...</p>
            {import.meta.env.DEV && (
              <div className="debug-info">
                <h4>Debug Info:</h4>
                <pre>{debug}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 