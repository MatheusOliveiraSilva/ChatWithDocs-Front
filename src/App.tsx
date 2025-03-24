import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Chat from './pages/Chat';
import authService from './services/authService';
import userPreferencesService from './services/userPreferencesService';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  // Initialize user preferences
  useEffect(() => {
    // Load and save default user preferences
    userPreferencesService.getPreferences();
  }, []);

  return (
    <Router>
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
      </Routes>
    </Router>
  );
}

export default App;
