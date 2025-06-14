import { Routes, Route, Navigate } from 'react-router-dom';
import Chat from './pages/Chat';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:threadId" element={<Chat />} />
      {/* Redirect any unknown routes to chat */}
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};

export default AppRouter; 