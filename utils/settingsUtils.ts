import { AppSettings } from '../types';

const SETTINGS_KEY = 'aria_app_settings';

export const loadSettings = (defaultSettings: AppSettings): AppSettings => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return defaultSettings;

    try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new settings in future updates
        return { ...defaultSettings, ...parsed };
    } catch (e) {
        console.error("Failed to parse settings", e);
        return defaultSettings;
    }
};

export const saveSettings = (settings: AppSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
