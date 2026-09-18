import type { BranchRecord } from '../types';

type BranchState = {
  hostChatId: string;
  branchId: string | null;
  branch: BranchRecord | null;
};

let state: BranchState = { hostChatId: '', branchId: null, branch: null };

export function resetBranchState(chatId: string): void {
  if (state.hostChatId !== chatId) state = { hostChatId: chatId, branchId: null, branch: null };
}

export function getCurrentBranchId(chatId: string): string | null {
  return state.hostChatId === chatId ? state.branchId : null;
}

export function setCurrentBranch(hostChatId: string, branch: BranchRecord): void {
  state = { hostChatId, branchId: branch.branchId, branch };
}
