import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';

import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Chat from './pages/Chat';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chat/:threadId" 
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export default AppRouter; 