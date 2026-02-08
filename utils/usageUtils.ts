/**
 * Utility for tracking Gemini API usage (Requests Per Day)
 * Uses LocalStorage to persist count and reset daily.
 */

const USAGE_KEY = 'aria_api_usage';
const DAILY_LIMIT = 250; // Limit for Gemini 2.5 Flash Native Audio Free Tier

interface DailyUsage {
    count: number;
    date: string; // ISO date string (YYYY-MM-DD)
}

const getToday = () => new Date().toISOString().split('T')[0];

export const getUsage = (): DailyUsage => {
    const stored = localStorage.getItem(USAGE_KEY);
    const today = getToday();

    if (stored) {
        const usage: DailyUsage = JSON.parse(stored);
        if (usage.date === today) {
            return usage;
        }
    }

    // If no usage found or older date, reset
    const newUsage = { count: 0, date: today };
    localStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
    return newUsage;
};

export const incrementUsage = (): DailyUsage => {
    const usage = getUsage();
    usage.count += 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));

    // Dispatch a custom event so the UI can update immediately
    window.dispatchEvent(new CustomEvent('aria-usage-updated', { detail: usage }));

    return usage;
};

export const getUsageStats = () => {
    const usage = getUsage();
    return {
        current: usage.count,
        limit: DAILY_LIMIT,
        percent: Math.min((usage.count / DAILY_LIMIT) * 100, 100)
    };
};
