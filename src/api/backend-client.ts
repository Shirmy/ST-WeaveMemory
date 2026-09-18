import type { BranchResponse, ChatReconcileRequest, ChatReconcileResponse, CreateBranchRequest, FloorFinalizeRequest, GenerationPrepareRequest, GenerationPrepareResponse, HealthResponse } from '../types';

const BASE = '/api/plugins/weavememory';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) throw new Error(`WeaveMemory backend ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export const backend = {
  health: () => request<HealthResponse>('/health'),
  prepareGeneration: (payload: GenerationPrepareRequest) => request<GenerationPrepareResponse>('/generation/prepare', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  finalizeFloor: (payload: FloorFinalizeRequest) => request<{ accepted: boolean; floorKey: string }>('/floor/finalize', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  reconcileChat: (payload: ChatReconcileRequest) => request<ChatReconcileResponse>('/chat/reconcile', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  createBranch: (payload: CreateBranchRequest) => request<BranchResponse>('/branch/create', {
    method: 'POST', body: JSON.stringify(payload)
  }),
  activateBranch: (chatId: string, branchId: string) => request<BranchResponse>('/branch/activate', {
    method: 'POST', body: JSON.stringify({ chatId, branchId })
  })
};
