import { backend } from '../api/backend-client';
import { currentChatId, getContext } from './context';
import { getSettings } from '../settings/store';
import { getCurrentBranchId, resetBranchState, setCurrentBranch } from './branch-state';

function selectedSwipeId(message: any): number | null {
  return Number.isSafeInteger(message?.swipe_id) ? message.swipe_id : null;
}

async function finalizeLatestAiFloor(): Promise<void> {
  if (!getSettings().enabled) return;
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
      } catch (error) {
        console.warn('[WeaveMemory] floor finalize failed:', error);
      }
      await reconcileCurrentChat();
      return;
    }
  }
}

function currentAiFloors(): Array<{ messageIndex: number; swipeId: number | null; content: string }> {
  const context = getContext();
  const chat = Array.isArray(context?.chat) ? context.chat : [];
  return chat.flatMap((message: any, messageIndex: number) => {
    if (message?.is_user !== false || message?.is_system === true) return [];
    const swipeId = selectedSwipeId(message);
    const swipes = Array.isArray(message?.swipes) ? message.swipes : [];
    const content = typeof swipes[swipeId ?? 0] === 'string' ? swipes[swipeId ?? 0] : String(message?.mes ?? '');
    return content ? [{ messageIndex, swipeId, content }] : [];
  });
}

let reconcileChain = Promise.resolve();

function reconcileCurrentChat(): Promise<void> {
  reconcileChain = reconcileChain.then(async () => {
    if (!getSettings().enabled) return;
    const context = getContext();
    const chatId = currentChatId(context);
    if (!chatId) return;
    try {
      const branchId = getCurrentBranchId(chatId);
      const result = await backend.reconcileChat({
        chatId,
        ...(branchId ? { branchId } : {}),
        floors: currentAiFloors()
      });
      setCurrentBranch(result.branch);
    } catch (error) {
      console.warn('[WeaveMemory] chat reconcile failed:', error);
    }
  });
  return reconcileChain;
}

export async function createBranchFromCurrentChat(forkFloorId: string, sourceBranchId?: string) {
  const context = getContext();
  const chatId = currentChatId(context);
  const currentBranchId = getCurrentBranchId(chatId);
  resetBranchState(chatId);
  const result = await backend.createBranch({
    chatId,
    ...(sourceBranchId ?? currentBranchId ? { sourceBranchId: sourceBranchId ?? currentBranchId! } : {}),
    forkFloorId
  });
  setCurrentBranch(result.branch);
  return result;
}

export async function activateCurrentChatBranch(branchId: string) {
  const context = getContext();
  const chatId = currentChatId(context);
  resetBranchState(chatId);
  const result = await backend.activateBranch(chatId, branchId);
  setCurrentBranch(result.branch);
  return result;
}

export function bindHostEvents(): void {
  const context = getContext();
  const eventSource = context?.eventSource;
  const types = context?.eventTypes ?? context?.event_types;
  if (!eventSource?.on || !types) return;

  if (types.GENERATION_ENDED) eventSource.on(types.GENERATION_ENDED, () => void finalizeLatestAiFloor());
  for (const key of ['MESSAGE_EDITED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'CHAT_CHANGED']) {
    const event = types[key];
    if (event) eventSource.on(event, () => {
      console.debug(`[WeaveMemory] host mutation: ${key}`);
      if (key === 'CHAT_CHANGED') resetBranchState(currentChatId(getContext()));
      void reconcileCurrentChat();
    });
  }
}
