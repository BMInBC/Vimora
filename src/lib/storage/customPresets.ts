import type { AppSettings, CreatorPreset } from '../types';
import { getAppSettings, updateAppSettings } from './localHistory';

const CUSTOM_PRESETS_KEY = 'vimora_custom_presets';
const FIRST_CONVERSION_KEY = 'vimora_completed_first_conversion';

export function getCustomPresets(): CreatorPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: CreatorPreset): CreatorPreset[] {
  if (typeof window === 'undefined') return [];
  const current = getCustomPresets();
  const normalized: CreatorPreset = {
    ...preset,
    id: preset.id || `custom_${Date.now()}`,
    destinationGroup: preset.destinationGroup || 'archive_custom',
    category: preset.category || 'archive',
    isCustom: true,
    iconId: preset.iconId || 'custom_export',
    compatibilityLabel: preset.compatibilityLabel || 'Custom local preset',
  };
  const idx = current.findIndex((p) => p.id === normalized.id);
  const next =
    idx >= 0
      ? current.map((p, i) => (i === idx ? normalized : p))
      : [normalized, ...current];
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function deleteCustomPreset(id: string): CreatorPreset[] {
  if (typeof window === 'undefined') return [];
  const next = getCustomPresets().filter((p) => p.id !== id);
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function duplicateCustomPreset(id: string): CreatorPreset[] {
  const existing = getCustomPresets().find((p) => p.id === id);
  if (!existing) return getCustomPresets();
  const copy: CreatorPreset = {
    ...existing,
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${existing.name} (Copy)`,
    isCustom: true,
  };
  return saveCustomPreset(copy);
}

export interface SettingsExportBundle {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  customPresets: CreatorPreset[];
}

export function exportSettingsBundleJson(): string {
  const bundle: SettingsExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getAppSettings(),
    customPresets: getCustomPresets(),
  };
  return JSON.stringify(bundle, null, 2);
}

export function importSettingsBundleJson(rawJson: string): {
  success: boolean;
  importedPresetsCount: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, importedPresetsCount: 0, error: 'Invalid JSON file format.' };
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      updateAppSettings(parsed.settings);
    }
    let count = 0;
    if (Array.isArray(parsed.customPresets)) {
      for (const preset of parsed.customPresets) {
        if (preset && typeof preset.name === 'string' && typeof preset.outputFormat === 'string') {
          saveCustomPreset(preset);
          count++;
        }
      }
    }
    return { success: true, importedPresetsCount: count };
  } catch {
    return { success: false, importedPresetsCount: 0, error: 'Could not parse JSON settings file.' };
  }
}

export function markFirstConversionCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FIRST_CONVERSION_KEY, 'true');
  } catch {}
}

export function hasCompletedFirstConversion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(FIRST_CONVERSION_KEY) === 'true';
  } catch {
    return false;
  }
}
