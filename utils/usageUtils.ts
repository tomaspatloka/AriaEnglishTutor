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

const isValidUsage = (value: any): value is DailyUsage =>
    !!value && typeof value.count === 'number' && typeof value.date === 'string';

// Bezpečný zápis — privátní režim / plná kvóta nesmí shodit aplikaci.
const safeSet = (usage: DailyUsage): void => {
    try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    } catch {
        // localStorage nedostupné nebo plné — usage se prostě neuloží.
    }
};

export const getUsage = (): DailyUsage => {
    const today = getToday();

    try {
        const stored = localStorage.getItem(USAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (isValidUsage(parsed) && parsed.date === today) {
                return parsed;
            }
        }
    } catch {
        // Poškozená data nebo nedostupné úložiště — spadneme na reset níže.
    }

    // Nenalezeno, poškozeno, nebo starší datum → reset.
    const newUsage = { count: 0, date: today };
    safeSet(newUsage);
    return newUsage;
};

export const incrementUsage = (): DailyUsage => {
    const usage = getUsage();
    usage.count += 1;
    safeSet(usage);

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
