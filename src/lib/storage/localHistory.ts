import { AppSettings, LocalHistoryRecord } from '../types';

const DEFAULT_HISTORY_KEY = 'vimora_conversion_history_guest';
const SETTINGS_KEY = 'vimora_app_settings';

export function getHistoryStorageKey(userId?: string | null): string {
  if (userId && typeof userId === 'string' && userId.trim()) {
    return `vimora_conversion_history_${userId.trim()}`;
  }
  return DEFAULT_HISTORY_KEY;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputDirectory: '',
  gpuAccelerationEnabled: true,
  autoOverwrite: false,
  preserveFolderStructure: false,
  theme: 'system',
  telemetryOptIn: true,
  maxConcurrentJobs: 2,
};

export function getLocalHistory(userId?: string | null): LocalHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getHistoryStorageKey(userId);
    const raw = localStorage.getItem(key);
    let history: LocalHistoryRecord[] = raw ? JSON.parse(raw) : [];

    // If a logged-in user is reading history, check if there are guest records to migrate/merge
    if (userId && typeof userId === 'string' && userId.trim()) {
      try {
        const guestRaw = localStorage.getItem(DEFAULT_HISTORY_KEY);
        if (guestRaw) {
          const guestRecords: LocalHistoryRecord[] = JSON.parse(guestRaw);
          if (Array.isArray(guestRecords) && guestRecords.length > 0) {
            const existingIds = new Set(history.map((r) => r.id));
            const newRecords = guestRecords
              .filter((r) => !existingIds.has(r.id))
              .map((r) => ({ ...r, userId: userId.trim() }));

            if (newRecords.length > 0) {
              history = [...newRecords, ...history].sort((a, b) => b.timestamp - a.timestamp);
              if (history.length > 250) history.length = 250;
              localStorage.setItem(key, JSON.stringify(history));
            }
            // Clear guest records now that they are safely linked to this user's account
            localStorage.removeItem(DEFAULT_HISTORY_KEY);
          }
        }
      } catch (migrateErr) {
        console.warn('Failed migrating guest history:', migrateErr);
      }
    }

    return history;
  } catch (err) {
    console.error('Failed reading local history:', err);
    return [];
  }
}

export function addLocalHistoryRecord(record: LocalHistoryRecord, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const targetUserId = userId || record.userId || null;
    const key = getHistoryStorageKey(targetUserId);
    const history = getLocalHistory(targetUserId);
    const enrichedRecord = { ...record, userId: targetUserId || undefined };
    history.unshift(enrichedRecord);
    // Keep last 250 records
    if (history.length > 250) {
      history.length = 250;
    }
    localStorage.setItem(key, JSON.stringify(history));
  } catch (err) {
    console.error('Failed saving history record:', err);
  }
}

export function deleteLocalHistoryRecord(id: string, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getHistoryStorageKey(userId);
    const history = getLocalHistory(userId).filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(history));
  } catch (err) {
    console.error('Failed deleting history record:', err);
  }
}

export function clearLocalHistory(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getHistoryStorageKey(userId);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed clearing history:', err);
  }
}

export function getAppSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Failed reading app settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function updateAppSettings(settings: Partial<AppSettings>): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const current = getAppSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed updating app settings:', err);
    return DEFAULT_SETTINGS;
  }
}