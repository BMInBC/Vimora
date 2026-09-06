import { AppSettings, LocalHistoryRecord } from '../types';

const HISTORY_KEY = 'vimora_conversion_history';
const SETTINGS_KEY = 'vimora_app_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputDirectory: '',
  gpuAccelerationEnabled: true,
  autoOverwrite: false,
  preserveFolderStructure: false,
  theme: 'system',
  telemetryOptIn: true,
  maxConcurrentJobs: 2,
};

export function getLocalHistory(): LocalHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed reading local history:', err);
    return [];
  }
}

export function addLocalHistoryRecord(record: LocalHistoryRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getLocalHistory();
    history.unshift(record);
    // Keep last 250 records
    if (history.length > 250) {
      history.length = 250;
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed saving history record:', err);
  }
}

export function deleteLocalHistoryRecord(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getLocalHistory().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed deleting history record:', err);
  }
}

export function clearLocalHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
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