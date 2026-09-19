import type { ExternalStateMapping } from '../types';

export type Settings = {
  debug: boolean;
  language: 'zh-CN';
  enabled: boolean;
  backendRequired: boolean;
  recentContextMode: 'raw' | 'summary';
  recentSummaryRegex: string;
  recentFloorCount: number;
  externalStateMappings: Record<string, ExternalStateMapping[]>;
  longMemoryIntervalFloors: number;
};

const KEY = 'weavememory';
const defaults: Settings = { debug: false, language: 'zh-CN', enabled: false, backendRequired: true, recentContextMode: 'raw', recentSummaryRegex: '', recentFloorCount: 4, externalStateMappings: {}, longMemoryIntervalFloors: 30 };

type SettingsContext = { extensionSettings?: Record<string, Partial<Settings>>; extension_settings?: Record<string, Partial<Settings>>; saveSettingsDebounced?: () => void };
function settingsContext(): SettingsContext | undefined {
  return (globalThis as typeof globalThis & { SillyTavern?: { getContext?: () => SettingsContext } }).SillyTavern?.getContext?.();
}

export function getSettings(): Settings {
  const context = settingsContext();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults };
  root[KEY] ??= { ...defaults };
  const settings = { ...defaults, ...root[KEY] };
  settings.recentContextMode = settings.recentContextMode === 'summary' ? 'summary' : 'raw';
  settings.recentFloorCount = Number.isInteger(settings.recentFloorCount) ? Math.min(20, Math.max(1, settings.recentFloorCount)) : defaults.recentFloorCount;
  settings.recentSummaryRegex = typeof settings.recentSummaryRegex === 'string' ? settings.recentSummaryRegex : '';
  settings.externalStateMappings = settings.externalStateMappings && typeof settings.externalStateMappings === 'object' ? settings.externalStateMappings : {};
  settings.longMemoryIntervalFloors = Number.isSafeInteger(settings.longMemoryIntervalFloors) ? Math.min(500, Math.max(1, settings.longMemoryIntervalFloors)) : defaults.longMemoryIntervalFloors;
  return settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const context = settingsContext();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults, ...patch };
  root[KEY] = { ...defaults, ...(root[KEY] ?? {}), ...patch };
  context?.saveSettingsDebounced?.();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('weavememory-settings-changed'));
  return { ...defaults, ...root[KEY] };
}
