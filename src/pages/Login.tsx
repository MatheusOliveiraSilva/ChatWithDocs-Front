import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Checking authentication token:', token ? 'Token exists' : 'No token');
    if (token) {
      console.log('User authenticated, navigating to /chat');
      navigate('/chat');
    }
  }, [navigate]);

  const handleLogin = () => {
    // Use the authService login function
    console.log('Login button clicked, calling authService.login()');
    authService.login();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">ChatWithDocuments</h1>
        <p className="login-subtitle">Chat intelligently with your documents</p>
        <button className="login-button" onClick={handleLogin}>
          Sign In
        </button>
      </div>
    </div>
  );
};

export default Login; 