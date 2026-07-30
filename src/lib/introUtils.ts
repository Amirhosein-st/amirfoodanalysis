/**
 * Utility functions for managing introduction modals
 */

export const INTRO_KEYS = {
  TRACKER: 'tracker-intro-seen',
  DIET: 'diet-intro-seen',
  WEEKLY_CHALLENGE: 'weekly-challenge-intro-seen',
} as const;

/**
 * Reset a specific introduction so it will be shown again on next visit
 */
export const resetIntroduction = (key: string) => {
  localStorage.removeItem(key);
};

/**
 * Reset all introductions
 */
export const resetAllIntroductions = () => {
  Object.values(INTRO_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

/**
 * Check if user has seen a specific introduction
 */
export const hasSeenIntroduction = (key: string): boolean => {
  return localStorage.getItem(key) === 'true';
};

