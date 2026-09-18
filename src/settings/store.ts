type Settings = {
  enabled: boolean;
  backendRequired: boolean;
};

const KEY = 'weavememory';
const defaults: Settings = { enabled: false, backendRequired: true };

export function getSettings(): Settings {
  const context = (globalThis as any).SillyTavern?.getContext?.();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults };
  root[KEY] ??= { ...defaults };
  return { ...defaults, ...root[KEY] };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const context = (globalThis as any).SillyTavern?.getContext?.();
  const root = context?.extensionSettings ?? context?.extension_settings;
  if (!root) return { ...defaults, ...patch };
  root[KEY] = { ...defaults, ...(root[KEY] ?? {}), ...patch };
  context?.saveSettingsDebounced?.();
  return { ...root[KEY] };
}
