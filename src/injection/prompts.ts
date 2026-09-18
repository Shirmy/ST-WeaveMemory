import { getContext } from '../host/context';

const LONG_MEMORY_SLOT = 'weavememory_long_memory';
const CURRENT_STATE_SLOT = 'weavememory_current_state';

export function clearMemoryPrompts(): void {
  const context = getContext();
  const position = context?.constants?.promptTypes?.IN_CHAT ?? 1;
  const role = context?.constants?.promptRoles?.SYSTEM ?? 0;
  context.setExtensionPrompt(LONG_MEMORY_SLOT, '', position, 9999, false, role);
  context.setExtensionPrompt(CURRENT_STATE_SLOT, '', position, 1, false, role);
}

export function applyMemoryPrompts(longMemory: string, currentState: string): void {
  const context = getContext();
  if (typeof context?.setExtensionPrompt !== 'function') throw new Error('SillyTavern setExtensionPrompt unavailable');
  const position = context?.constants?.promptTypes?.IN_CHAT ?? 1;
  const role = context?.constants?.promptRoles?.SYSTEM ?? 0;
  context.setExtensionPrompt(LONG_MEMORY_SLOT, longMemory, position, 9999, false, role);
  context.setExtensionPrompt(CURRENT_STATE_SLOT, currentState, position, 1, false, role);
}
