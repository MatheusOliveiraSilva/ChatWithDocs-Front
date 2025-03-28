import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/AuthCallback.css';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuthentication = async () => {
      try {
        // Check if we have a token in the URL (new format)
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        
        if (token) {
          // Store the token in localStorage
          localStorage.setItem('token', token);
          console.log('Token received and stored successfully');
          // Redirect to chat page
          navigate('/chat');
          return;
        }
        
        // If no token, try the old method with code
        const code = urlParams.get('code');
        if (!code) {
          setError('Authentication token or code not found');
          return;
        }

        // Process authentication with code
        const success = await authService.handleAuthCallback(code);
        
        if (success) {
          // Redirect to the main page after successful authentication
          navigate('/chat');
        } else {
          setError('Authentication failed');
        }
      } catch (err) {
        console.error('Error during callback processing:', err);
        setError('An error occurred during authentication');
      }
    };

    processAuthentication();
  }, [location, navigate]);

  return (
    <div className="callback-container">
      <div className="callback-card">
        {error ? (
          <p className="callback-error">{error}</p>
        ) : (
          <div className="callback-loading">
            <div className="spinner"></div>
            <p>Processing your authentication...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 