const KEY = 'weavememory';
const defaults = { enabled: false, backendRequired: true };
export function getSettings() {
    const context = globalThis.SillyTavern?.getContext?.();
    const root = context?.extensionSettings ?? context?.extension_settings;
    if (!root)
        return { ...defaults };
    root[KEY] ??= { ...defaults };
    return { ...defaults, ...root[KEY] };
}
export function updateSettings(patch) {
    const context = globalThis.SillyTavern?.getContext?.();
    const root = context?.extensionSettings ?? context?.extension_settings;
    if (!root)
        return { ...defaults, ...patch };
    root[KEY] = { ...defaults, ...(root[KEY] ?? {}), ...patch };
    context?.saveSettingsDebounced?.();
    return { ...root[KEY] };
}
