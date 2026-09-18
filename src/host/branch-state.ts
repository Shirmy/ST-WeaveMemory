import type { BranchRecord } from '../types';

type BranchState = {
  chatId: string;
  branchId: string | null;
  branch: BranchRecord | null;
};

let state: BranchState = { chatId: '', branchId: null, branch: null };

export function resetBranchState(chatId: string): void {
  if (state.chatId !== chatId) state = { chatId, branchId: null, branch: null };
}

export function getCurrentBranchId(chatId: string): string | null {
  return state.chatId === chatId ? state.branchId : null;
}

export function setCurrentBranch(branch: BranchRecord): void {
  state = { chatId: branch.chatId, branchId: branch.branchId, branch };
}
