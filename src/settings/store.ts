type Settings = {
  enabled: boolean;
  backendRequired: boolean;
  recentContextMode: 'raw' | 'summary';
  recentSummaryRegex: string;
  recentFloorCount: number;
};

const KEY = 'weavememory';
const defaults: Settings = { enabled: false, backendRequired: true, recentContextMode: 'raw', recentSummaryRegex: '', recentFloorCount: 4 };

export function getSettings(): Settings {
  const context = (globalThis as any).SillyTavern?.getContext?.();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults };
  root[KEY] ??= { ...defaults };
  const settings = { ...defaults, ...root[KEY] };
  settings.recentContextMode = settings.recentContextMode === 'summary' ? 'summary' : 'raw';
  settings.recentFloorCount = Number.isInteger(settings.recentFloorCount) ? Math.min(20, Math.max(1, settings.recentFloorCount)) : defaults.recentFloorCount;
  settings.recentSummaryRegex = typeof settings.recentSummaryRegex === 'string' ? settings.recentSummaryRegex : '';
  return settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const context = (globalThis as any).SillyTavern?.getContext?.();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults, ...patch };
  root[KEY] = { ...defaults, ...(root[KEY] ?? {}), ...patch };
  context?.saveSettingsDebounced?.();
  return { ...root[KEY] };
}
