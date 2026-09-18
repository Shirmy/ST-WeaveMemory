export function getContext(): any {
  const api = (globalThis as any).SillyTavern;
  if (!api?.getContext) throw new Error('SillyTavern context unavailable');
  return api.getContext();
}

export function currentChatId(context = getContext()): string {
  return String(context?.chatId ?? context?.chat_id ?? '');
}

export function latestUser(context = getContext()): { index: number | null; text: string } {
  const chat = Array.isArray(context?.chat) ? context.chat : [];
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    const message = chat[i];
    if (message?.is_user === true) return { index: i, text: String(message?.mes ?? '') };
  }
  return { index: null, text: '' };
}
