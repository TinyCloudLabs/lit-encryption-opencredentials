import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  autoSelectCredentials: true,
  cacheDuration: 24,
  defaultWallet: null,
  notificationPreferences: {
    showSuccess: true,
    showErrors: true
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('appSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings and persist to localStorage
  const updateSettings = (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  };

  // Clear all cached content
  const clearCache = () => {
    try {
      localStorage.removeItem('contentCache');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    updateSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    loading,
    updateSettings,
    clearCache,
    resetSettings
  };
}