import type { ExternalStateMapping, ExternalStateSnapshot } from '../types';

export function characterCardId(context: unknown): string | null {
  const value = context as Record<string, unknown>;
  const character = value.character as Record<string, unknown> | undefined;
  const candidates = [value.characterId, value.character_id, character?.id, character?.data && (character.data as Record<string, unknown>).id, character?.avatar, value.avatar];
  const id = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  return typeof id === 'string' ? id.trim() : null;
}

export function previousAssistantIndex(context: unknown, latestUserIndex: number): number | null {
  const chat = (context as { chat?: unknown[] }).chat;
  if (!Array.isArray(chat)) return null;
  for (let index = latestUserIndex - 1; index >= 0; index -= 1) if ((chat[index] as { is_user?: boolean })?.is_user === false) return index;
  return null;
}

export function readMvuExternalState(context: unknown, messageIndex: number | null, mappings: ExternalStateMapping[]): ExternalStateSnapshot {
  const base = { source: 'mvu' as const, detected: false, statData: null, messageIndex, swipeId: null, cardId: characterCardId(context), mappings };
  const mvu = (globalThis as typeof globalThis & { Mvu?: { getMvuData?: (input: { type: 'message'; message_id: number }) => unknown } }).Mvu;
  if (!mvu?.getMvuData || messageIndex === null) return base;
  try {
    const message = ((context as { chat?: unknown[] }).chat?.[messageIndex] ?? {}) as { swipe_id?: number };
    const swipeId = Number.isSafeInteger(message.swipe_id) ? message.swipe_id! : 0;
    const data = mvu.getMvuData({ type: 'message', message_id: messageIndex }) as { stat_data?: unknown } | null;
    return { ...base, detected: true, statData: data?.stat_data ?? null, swipeId };
  } catch (error) {
    return { ...base, failure: error instanceof Error ? error.message : 'mvu read failed' };
  }
}
