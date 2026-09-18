import { backend } from '../api/backend-client.js';
import { currentChatId, getContext } from './context.js';
import { getSettings } from '../settings/store.js';
function selectedSwipeId(message) {
    return Number.isSafeInteger(message?.swipe_id) ? message.swipe_id : null;
}
async function finalizeLatestAiFloor() {
    if (!getSettings().enabled)
        return;
    const context = getContext();
    const chat = Array.isArray(context?.chat) ? context.chat : [];
    for (let i = chat.length - 1; i >= 0; i -= 1) {
        const message = chat[i];
        if (message?.is_user === false && message?.is_system !== true) {
            try {
                await backend.finalizeFloor({
                    chatId: currentChatId(context),
                    messageIndex: i,
                    swipeId: selectedSwipeId(message),
                    content: String(message?.mes ?? '')
                });
            }
            catch (error) {
                console.warn('[WeaveMemory] floor finalize failed:', error);
            }
            return;
        }
    }
}
export function bindHostEvents() {
    const context = getContext();
    const eventSource = context?.eventSource;
    const types = context?.eventTypes ?? context?.event_types;
    if (!eventSource?.on || !types)
        return;
    if (types.GENERATION_ENDED)
        eventSource.on(types.GENERATION_ENDED, () => void finalizeLatestAiFloor());
    for (const key of ['MESSAGE_EDITED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'CHAT_CHANGED']) {
        const event = types[key];
        if (event)
            eventSource.on(event, () => console.debug(`[WeaveMemory] host mutation: ${key}`));
    }
}
