export function getContext() {
    const api = globalThis.SillyTavern;
    if (!api?.getContext)
        throw new Error('SillyTavern context unavailable');
    return api.getContext();
}
export function currentChatId(context = getContext()) {
    return String(context?.chatId ?? context?.chat_id ?? '');
}
export function latestUser(context = getContext()) {
    const chat = Array.isArray(context?.chat) ? context.chat : [];
    for (let i = chat.length - 1; i >= 0; i -= 1) {
        const message = chat[i];
        if (message?.is_user === true)
            return { index: i, text: String(message?.mes ?? '') };
    }
    return { index: null, text: '' };
}
