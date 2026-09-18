import { backend } from '../api/backend-client.js';
import { currentChatId, getContext, latestUser } from './context.js';
import { applyMemoryPrompts, clearMemoryPrompts } from '../injection/prompts.js';
import { getSettings } from '../settings/store.js';
export async function generationInterceptor(_coreChat, contextSize, _abort, rawType) {
    const settings = getSettings();
    if (!settings.enabled) {
        clearMemoryPrompts();
        return;
    }
    const context = getContext();
    const chatId = currentChatId(context);
    const user = latestUser(context);
    if (!chatId || user.index === null)
        return;
    try {
        const result = await backend.prepareGeneration({
            chatId,
            generationType: String(rawType ?? 'normal'),
            contextSize: Number(contextSize) || 0,
            latestUserIndex: user.index,
            latestUserText: user.text
        });
        if (!result.ready)
            throw new Error(result.reason || 'WeaveMemory generation gate rejected this generation');
        applyMemoryPrompts(result.longMemory || '', result.currentState || '');
    }
    catch (error) {
        clearMemoryPrompts();
        if (settings.backendRequired)
            throw error;
        console.warn('[WeaveMemory] prepare degraded:', error);
    }
}
