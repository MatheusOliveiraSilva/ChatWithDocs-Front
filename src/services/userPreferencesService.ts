// User preference types
type Theme = 'light' | 'dark';
type Language = 'en' | 'pt';

interface UserPreferences {
  theme: Theme;
  language: Language;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'dark',
  language: 'en'
};

// Local storage key
const PREFERENCES_KEY = 'user_preferences';

export const userPreferencesService = {
  // Get user preferences from local storage
  getPreferences: (): UserPreferences => {
    const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (savedPreferences) {
      return JSON.parse(savedPreferences);
    }
    
    // Initialize with default preferences if not found
    userPreferencesService.savePreferences(defaultPreferences);
    return defaultPreferences;
  },

  // Save user preferences to local storage
  savePreferences: (preferences: UserPreferences): void => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  },

  // Update theme preference
  setTheme: (theme: Theme): void => {
    const currentPreferences = userPreferencesService.getPreferences();
    userPreferencesService.savePreferences({
      ...currentPreferences,
      theme
    });
  },

  // Update language preference
  setLanguage: (language: Language): void => {
    const currentPreferences = userPreferencesService.getPreferences();
    userPreferencesService.savePreferences({
      ...currentPreferences,
      language
    });
  }
};

export default userPreferencesService; 