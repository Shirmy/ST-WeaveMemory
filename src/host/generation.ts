import { backend } from '../api/backend-client';
import { currentChatId, getContext, latestUser } from './context';
import { characterCardId, previousAssistantIndex, readMvuExternalState } from './external-state';
import { applyMemoryPrompts, clearMemoryPrompts } from '../injection/prompts';
import { getSettings } from '../settings/store';
import { generationFailureMessage } from './generation-reason';
export { generationFailureMessage } from './generation-reason';

export async function generationInterceptor(_coreChat: unknown, contextSize: number, _abort: unknown, rawType?: unknown): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled) {
    clearMemoryPrompts();
    return;
  }

  const context = getContext();
  const chatId = currentChatId(context);
  const user = latestUser(context);
  if (!chatId || user.index === null) return;
  const cardId = characterCardId(context);
  const mappings = cardId ? settings.externalStateMappings[cardId] ?? [] : [];
  const externalState = readMvuExternalState(context, previousAssistantIndex(context, user.index), mappings);

  try {
    const result = await backend.prepareGeneration({
      chatId,
      generationType: String(rawType ?? 'normal'),
      contextSize: Number(contextSize) || 0,
      latestUserIndex: user.index,
      latestUserText: user.text,
      recentContextMode: settings.recentContextMode,
      recentSummaryRegex: settings.recentSummaryRegex,
      recentFloorCount: settings.recentFloorCount,
      externalState
    });

    if (!result.ready) {
      clearMemoryPrompts();
      const message = generationFailureMessage(result.reason);
      notifyGenerationBlocked(message);
      throw new Error(result.reason || 'WeaveMemory generation gate rejected this generation');
    }
    applyMemoryPrompts(result.longMemory || '', result.currentState || '');
  } catch (error) {
    clearMemoryPrompts();
    if (settings.backendRequired) throw error;
    console.warn('[WeaveMemory] prepare degraded:', error);
  }
}


function notifyGenerationBlocked(message: string): void {
  const host = globalThis as typeof globalThis & { toastr?: { error?: (text: string, title?: string) => void } };
  if (typeof host.toastr?.error === 'function') host.toastr.error(message, '织忆');
  else console.error(`[WeaveMemory] ${message}`);
}
