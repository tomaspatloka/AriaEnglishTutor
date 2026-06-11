import { AppSettings } from '../types';

const SETTINGS_KEY = 'aria_app_settings';

export const loadSettings = (defaultSettings: AppSettings): AppSettings => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (!saved) return defaultSettings;
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new settings in future updates
        return { ...defaultSettings, ...parsed };
    } catch (e) {
        // Poškozená data nebo nedostupné úložiště (privátní režim) → defaulty.
        console.error("Failed to parse settings", e);
        return defaultSettings;
    }
};

export const saveSettings = (settings: AppSettings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        // Plná kvóta nebo nedostupné úložiště — nastavení se prostě neuloží.
        console.error("Failed to save settings", e);
    }
};
