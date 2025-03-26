import { BrowserRouter as Router } from 'react-router-dom';
import { useEffect } from 'react';
import AppRouter from './router';
import userPreferencesService from './services/userPreferencesService';

function App() {
  // Initialize user preferences
  useEffect(() => {
    // Load and save default user preferences
    userPreferencesService.getPreferences();
  }, []);

  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
